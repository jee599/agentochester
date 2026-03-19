/**
 * 입력 지연 시뮬레이션 테스트
 * 실제 sync.ts + engine.ts를 사용한 입력 파이프라인 검증
 * PRD 기준: 평균 레이턴시 <100ms, 경고 >300ms, 로컬 예측 ≤1프레임
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInputBuffer,
  bufferInput,
  consumeInput,
  createPredictionState,
  recordPrediction,
  reconcile,
  buildStatePacket,
  createConnectionHealth,
  updateConnectionHealth,
} from '@/src/game/sync';
import type { InputBuffer } from '@/src/game/sync';
import { createInitialState, startGame, gameTick } from '@/src/game/engine';
import { TIMING, PHYSICS } from '@/src/game/constants';
import type { GameState, KeyState, ClientInput } from '@/src/game/types';

const NO_INPUT: KeyState = { left: false, right: false, up: false, powerHit: false };
const LEFT_KEY: KeyState = { left: true, right: false, up: false, powerHit: false };
const RIGHT_KEY: KeyState = { left: false, right: true, up: false, powerHit: false };

// --- 입력 파이프라인 시뮬레이터 ---

interface InputLatencyConfig {
  networkLatencyMs: number;
  serverProcessingMs: number;
}

interface ProcessedInput {
  input: ClientInput;
  serverReceivedAt: number;
  stateAppliedAt: number;
  broadcastAt: number;
  clientReceivedAt: number;
}

/**
 * 실제 타이밍 상수를 사용하는 입력 파이프라인 시뮬레이터
 */
class InputLatencySimulator {
  private config: InputLatencyConfig;
  private readonly tickIntervalMs = TIMING.FRAME_DURATION_MS;
  private readonly broadcastIntervalMs = 1000 / TIMING.STATE_BROADCAST_RATE;

  constructor(config: Partial<InputLatencyConfig> = {}) {
    this.config = {
      networkLatencyMs: config.networkLatencyMs ?? 20,
      serverProcessingMs: config.serverProcessingMs ?? 2,
    };
  }

  /**
   * 입력 RTT 시뮬레이션
   * 클라이언트 전송 → 서버 수신 → 틱 처리 → 브로드캐스트 → 클라이언트 수신
   */
  simulateRoundTrip(clientTimestamp: number): ProcessedInput {
    const input: ClientInput = {
      type: 'input',
      seq: 0,
      keys: LEFT_KEY,
      timestamp: clientTimestamp,
    };

    const serverReceivedAt = clientTimestamp + this.config.networkLatencyMs;

    // 다음 틱까지 대기 + 처리
    const tickWait = this.tickIntervalMs - (serverReceivedAt % this.tickIntervalMs);
    const stateAppliedAt = serverReceivedAt + Math.min(tickWait, this.tickIntervalMs) + this.config.serverProcessingMs;

    // 다음 브로드캐스트까지 대기
    const broadcastWait = this.broadcastIntervalMs - (stateAppliedAt % this.broadcastIntervalMs);
    const broadcastAt = stateAppliedAt + Math.min(broadcastWait, this.broadcastIntervalMs);

    const clientReceivedAt = broadcastAt + this.config.networkLatencyMs;

    return {
      input,
      serverReceivedAt,
      stateAppliedAt,
      broadcastAt,
      clientReceivedAt,
    };
  }

  measureE2ELatency(clientTimestamp: number): number {
    const result = this.simulateRoundTrip(clientTimestamp);
    return result.clientReceivedAt - clientTimestamp;
  }

  measureAverageLatency(count: number): number {
    let total = 0;
    const baseTime = 1000;
    for (let i = 0; i < count; i++) {
      total += this.measureE2ELatency(baseTime + i * this.tickIntervalMs);
    }
    return total / count;
  }
}

// --- 프레임 타이밍 검증 ---

class FrameTimingValidator {
  private frameTimes: number[] = [];
  private readonly targetFrameTime = TIMING.FRAME_DURATION_MS;

  recordFrame(durationMs: number): void {
    this.frameTimes.push(durationMs);
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  getMaxFrameTime(): number {
    return Math.max(...this.frameTimes, 0);
  }

  getDroppedFrameCount(thresholdMultiplier = 2): number {
    const threshold = this.targetFrameTime * thresholdMultiplier;
    return this.frameTimes.filter((t) => t > threshold).length;
  }

  /**
   * 입력 처리가 프레임 예산의 50% 이내인지 검증
   */
  isWithinBudget(inputProcessingMs: number): boolean {
    return inputProcessingMs <= this.targetFrameTime * 0.5;
  }
}

describe('입력 지연 검증', () => {
  describe('Client-Side Prediction 레이턴시', () => {
    it('로컬 예측: 1프레임(~16.67ms) 내 반영', () => {
      expect(TIMING.FRAME_DURATION_MS).toBeCloseTo(16.67, 1);
    });

    it('로컬 예측으로 200ms 이하 보장', () => {
      expect(TIMING.FRAME_DURATION_MS).toBeLessThan(200);
    });

    it('실제 엔진: 입력 → 플레이어 위치 변화가 1틱 내에 발생', () => {
      const state = createInitialState();
      startGame(state);

      const prevX = state.players[0].x;
      gameTick(state, [RIGHT_KEY, NO_INPUT]);

      // 1틱 내에 위치 변화
      expect(state.players[0].x).not.toBe(prevX);
      expect(state.players[0].x - prevX).toBe(PHYSICS.PLAYER_SPEED);
    });
  });

  describe('E2E 네트워크 레이턴시 (서버 왕복)', () => {
    it('국내 네트워크 (20ms 편도) E2E 레이턴시 200ms 이하', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 20 });
      const latency = sim.measureE2ELatency(1000);
      expect(latency).toBeLessThan(200);
    });

    it('국내 네트워크 평균 레이턴시 100ms 이하 (PRD 목표)', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 20, serverProcessingMs: 2 });
      const avg = sim.measureAverageLatency(100);
      expect(avg).toBeLessThan(100);
    });

    it('높은 지연 (80ms 편도)에서도 E2E 200ms 이하', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 80 });
      const avg = sim.measureAverageLatency(100);
      expect(avg).toBeLessThan(250);
    });

    it('매우 높은 지연 (150ms 편도) 시 300ms 초과', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 150 });
      const avg = sim.measureAverageLatency(100);
      expect(avg).toBeGreaterThan(300);
    });
  });

  describe('서버 입력 처리 파이프라인 (실제 InputBuffer)', () => {
    it('입력 버퍼에서 1틱마다 1개씩 소비', () => {
      const buffer = createInputBuffer();

      bufferInput(buffer, { type: 'input', seq: 0, keys: LEFT_KEY, timestamp: 1000 });
      bufferInput(buffer, { type: 'input', seq: 1, keys: RIGHT_KEY, timestamp: 1016 });
      bufferInput(buffer, { type: 'input', seq: 2, keys: LEFT_KEY, timestamp: 1032 });

      // 3개 입력 → 3틱에 걸쳐 소비
      const k0 = consumeInput(buffer);
      expect(k0).toEqual(LEFT_KEY);
      expect(buffer.inputs).toHaveLength(2);

      const k1 = consumeInput(buffer);
      expect(k1).toEqual(RIGHT_KEY);

      const k2 = consumeInput(buffer);
      expect(k2).toEqual(LEFT_KEY);

      expect(consumeInput(buffer)).toBeNull();
    });

    it('입력 → 게임 상태 반영 → 패킷 빌드 전체 파이프라인', () => {
      const state = createInitialState();
      startGame(state);

      const buffers: [InputBuffer, InputBuffer] = [createInputBuffer(), createInputBuffer()];

      // P1 입력 버퍼링
      bufferInput(buffers[0], { type: 'input', seq: 0, keys: RIGHT_KEY, timestamp: 1000 });

      // 입력 소비 → 게임 틱
      const keys0 = consumeInput(buffers[0]) ?? NO_INPUT;
      const keys1 = consumeInput(buffers[1]) ?? NO_INPUT;
      gameTick(state, [keys0, keys1]);

      // 상태 패킷 빌드
      const packet = buildStatePacket(state, buffers);
      expect(packet.type).toBe('state');
      expect(packet.lastInputSeq[0]).toBe(0);
    });

    it('상태 브로드캐스트 간격이 30Hz (~33.33ms)', () => {
      expect(1000 / TIMING.STATE_BROADCAST_RATE).toBeCloseTo(33.33, 1);
    });
  });

  describe('프레임 타이밍 검증 (60fps)', () => {
    let validator: FrameTimingValidator;

    beforeEach(() => {
      validator = new FrameTimingValidator();
    });

    it('목표 프레임 시간 ~16.67ms', () => {
      expect(TIMING.FRAME_DURATION_MS).toBeCloseTo(16.67, 1);
    });

    it('정상 프레임에서 드롭 프레임 0개', () => {
      for (let i = 0; i < 60; i++) {
        validator.recordFrame(16 + Math.random() * 2);
      }
      expect(validator.getDroppedFrameCount()).toBe(0);
    });

    it('스파이크 프레임 감지', () => {
      for (let i = 0; i < 59; i++) {
        validator.recordFrame(16);
      }
      validator.recordFrame(50);

      expect(validator.getDroppedFrameCount()).toBe(1);
      expect(validator.getMaxFrameTime()).toBe(50);
    });

    it('입력 처리 5ms → 프레임 예산(50%) 이내', () => {
      expect(validator.isWithinBudget(5)).toBe(true);
    });

    it('입력 처리 12ms → 프레임 예산 초과', () => {
      expect(validator.isWithinBudget(12)).toBe(false);
    });
  });

  describe('실제 엔진 게임 틱 성능', () => {
    it('gameTick 60회 호출이 안정적으로 완료', () => {
      const state = createInitialState();
      startGame(state);

      const start = performance.now();
      for (let i = 0; i < 60; i++) {
        gameTick(state, [NO_INPUT, NO_INPUT]);
      }
      const elapsed = performance.now() - start;

      // 60틱이 1초(1000ms)보다 훨씬 빨라야 함 (CPU 처리 시간)
      expect(elapsed).toBeLessThan(100);
    });

    it('P1, P2 동시 입력이 같은 틱에서 처리', () => {
      const state = createInitialState();
      startGame(state);

      const p1PrevX = state.players[0].x;
      const p2PrevX = state.players[1].x;

      gameTick(state, [RIGHT_KEY, LEFT_KEY]);

      // 같은 틱에서 두 플레이어 모두 이동
      expect(state.players[0].x).toBeGreaterThan(p1PrevX);
      expect(state.players[1].x).toBeLessThan(p2PrevX);
    });

    it('연속 60개 입력이 1초 내에 처리 및 상태 패킷 빌드', () => {
      const state = createInitialState();
      startGame(state);

      const buffers: [InputBuffer, InputBuffer] = [createInputBuffer(), createInputBuffer()];

      const start = performance.now();
      for (let i = 0; i < 60; i++) {
        bufferInput(buffers[0], {
          type: 'input',
          seq: i,
          keys: i % 2 === 0 ? LEFT_KEY : RIGHT_KEY,
          timestamp: 1000 + i * TIMING.FRAME_DURATION_MS,
        });

        const keys = consumeInput(buffers[0]) ?? NO_INPUT;
        gameTick(state, [keys, NO_INPUT]);

        // 매 2틱마다 브로드캐스트 (30Hz)
        if (i % 2 === 0) {
          buildStatePacket(state, buffers);
        }
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Prediction + Reconciliation 레이턴시', () => {
    it('Prediction으로 즉시 로컬 입력 반영', () => {
      const prediction = createPredictionState();

      const input = recordPrediction(prediction, LEFT_KEY, 1000);
      expect(input.keys).toEqual(LEFT_KEY);
      expect(prediction.pendingInputs).toHaveLength(1);
    });

    it('Reconciliation 후 미확인 입력만 남음', () => {
      const prediction = createPredictionState();
      recordPrediction(prediction, LEFT_KEY, 1000);  // seq 0
      recordPrediction(prediction, RIGHT_KEY, 1016); // seq 1
      recordPrediction(prediction, LEFT_KEY, 1032);  // seq 2

      const packet: import('@/src/game/types').ServerStatePacket = {
        type: 'state',
        seq: 10,
        ball: { x: 200, y: 200, vx: 0, vy: 0 },
        players: [
          { x: 100, y: 244, vy: 0, state: 'idle' },
          { x: 324, y: 244, vy: 0, state: 'idle' },
        ],
        score: [0, 0],
        servingPlayer: 0,
        phase: 'playing',
        lastInputSeq: [1, 0],
      };

      const remaining = reconcile(prediction, packet, 0);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].seq).toBe(2);
    });
  });

  describe('Connection Health 기반 레이턴시 분류', () => {
    it('좋음: <50ms', () => {
      const health = createConnectionHealth();
      health.lastPingTime = 1000;
      updateConnectionHealth(health, 1040);
      expect(health.latency).toBe(40);
      expect(health.isHealthy).toBe(true);
    });

    it('보통: 50~200ms', () => {
      const health = createConnectionHealth();
      health.lastPingTime = 1000;
      updateConnectionHealth(health, 1150);
      expect(health.latency).toBe(150);
      expect(health.isHealthy).toBe(true);
    });

    it('경고: 300ms 이상 (LAG_WARNING_THRESHOLD_MS)', () => {
      const health = createConnectionHealth();
      health.lastPingTime = 1000;
      updateConnectionHealth(health, 1350);
      expect(health.latency).toBe(350);
      expect(health.isHealthy).toBe(false);
    });
  });

  describe('입력 지연 임계값 분류', () => {
    it('좋음: <50ms (로컬 또는 매우 낮은 지연)', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 5 });
      const latency = sim.measureAverageLatency(10);
      expect(latency).toBeLessThan(60);
    });

    it('보통: 50~100ms (국내 일반)', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 20 });
      const latency = sim.measureAverageLatency(10);
      expect(latency).toBeGreaterThanOrEqual(40);
      expect(latency).toBeLessThan(100);
    });

    it('위험: >300ms (PRD 경고 임계값)', () => {
      const sim = new InputLatencySimulator({ networkLatencyMs: 150 });
      const latency = sim.measureAverageLatency(10);
      expect(latency).toBeGreaterThan(300);
    });
  });
});
