/**
 * WebSocket 연결 안정성 테스트
 * 실제 sync.ts 모듈 import — Input Buffer, Prediction, Reconciliation, Interpolation, Connection Health
 * PRD 기준: 5초 내 재연결, 최대 3회 시도, 300ms 초과 시 경고
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInputBuffer,
  bufferInput,
  consumeInput,
  createPredictionState,
  recordPrediction,
  reconcile,
  createInterpolationState,
  pushServerState,
  interpolate,
  buildStatePacket,
  createConnectionHealth,
  updateConnectionHealth,
} from '@/src/game/sync';
import type { InputBuffer, PredictionState, InterpolationState, ConnectionHealth } from '@/src/game/sync';
import type { ClientInput, KeyState, ServerStatePacket } from '@/src/game/types';
import { createInitialState, startGame } from '@/src/game/engine';
import { TIMING } from '@/src/game/constants';

const LEFT_KEY: KeyState = { left: true, right: false, up: false, powerHit: false };
const RIGHT_KEY: KeyState = { left: false, right: true, up: false, powerHit: false };
const NO_INPUT: KeyState = { left: false, right: false, up: false, powerHit: false };

// 테스트용 ServerStatePacket 생성
function createTestPacket(overrides: Partial<ServerStatePacket> = {}): ServerStatePacket {
  return {
    type: 'state',
    seq: 0,
    ball: { x: 200, y: 200, vx: 0, vy: 0 },
    players: [
      { x: 108, y: 244, vy: 0, state: 'idle' },
      { x: 324, y: 244, vy: 0, state: 'idle' },
    ],
    score: [0, 0],
    servingPlayer: 0,
    phase: 'serving',
    lastInputSeq: [0, 0],
    ...overrides,
  };
}

describe('WebSocket 연결 안정성 — Input Buffer (서버 측)', () => {
  let buffer: InputBuffer;

  beforeEach(() => {
    buffer = createInputBuffer();
  });

  it('초기 상태: 빈 버퍼, lastProcessedSeq = -1', () => {
    expect(buffer.inputs).toHaveLength(0);
    expect(buffer.lastProcessedSeq).toBe(-1);
  });

  it('입력 버퍼링: 순서대로 추가', () => {
    bufferInput(buffer, { type: 'input', seq: 0, keys: LEFT_KEY, timestamp: 1000 });
    bufferInput(buffer, { type: 'input', seq: 1, keys: RIGHT_KEY, timestamp: 1016 });

    expect(buffer.inputs).toHaveLength(2);
    expect(buffer.inputs[0].seq).toBe(0);
    expect(buffer.inputs[1].seq).toBe(1);
  });

  it('역순 입력도 순서대로 정렬', () => {
    bufferInput(buffer, { type: 'input', seq: 2, keys: LEFT_KEY, timestamp: 1032 });
    bufferInput(buffer, { type: 'input', seq: 0, keys: RIGHT_KEY, timestamp: 1000 });
    bufferInput(buffer, { type: 'input', seq: 1, keys: LEFT_KEY, timestamp: 1016 });

    expect(buffer.inputs[0].seq).toBe(0);
    expect(buffer.inputs[1].seq).toBe(1);
    expect(buffer.inputs[2].seq).toBe(2);
  });

  it('이미 처리된 seq는 무시 (중복 방지)', () => {
    bufferInput(buffer, { type: 'input', seq: 0, keys: LEFT_KEY, timestamp: 1000 });
    consumeInput(buffer); // seq 0 소비 → lastProcessedSeq = 0

    bufferInput(buffer, { type: 'input', seq: 0, keys: RIGHT_KEY, timestamp: 1016 });
    expect(buffer.inputs).toHaveLength(0);
  });

  it('consumeInput: 하나씩 꺼내면서 lastProcessedSeq 갱신', () => {
    bufferInput(buffer, { type: 'input', seq: 0, keys: LEFT_KEY, timestamp: 1000 });
    bufferInput(buffer, { type: 'input', seq: 1, keys: RIGHT_KEY, timestamp: 1016 });

    const keys0 = consumeInput(buffer);
    expect(keys0).toEqual(LEFT_KEY);
    expect(buffer.lastProcessedSeq).toBe(0);

    const keys1 = consumeInput(buffer);
    expect(keys1).toEqual(RIGHT_KEY);
    expect(buffer.lastProcessedSeq).toBe(1);
  });

  it('빈 버퍼에서 consumeInput → null', () => {
    expect(consumeInput(buffer)).toBeNull();
  });
});

describe('WebSocket 연결 안정성 — Client-Side Prediction', () => {
  let prediction: PredictionState;

  beforeEach(() => {
    prediction = createPredictionState();
  });

  it('초기 상태: 빈 pendingInputs, inputSeq = 0', () => {
    expect(prediction.pendingInputs).toHaveLength(0);
    expect(prediction.inputSeq).toBe(0);
  });

  it('recordPrediction: 입력 시퀀스 자동 증가', () => {
    const input0 = recordPrediction(prediction, LEFT_KEY, 1000);
    const input1 = recordPrediction(prediction, RIGHT_KEY, 1016);

    expect(input0.seq).toBe(0);
    expect(input1.seq).toBe(1);
    expect(prediction.pendingInputs).toHaveLength(2);
  });

  it('recordPrediction: ClientInput 형식 반환', () => {
    const input = recordPrediction(prediction, LEFT_KEY, 1000);
    expect(input).toMatchObject({
      type: 'input',
      seq: 0,
      keys: LEFT_KEY,
      timestamp: 1000,
    });
  });
});

describe('WebSocket 연결 안정성 — Server Reconciliation', () => {
  let prediction: PredictionState;

  beforeEach(() => {
    prediction = createPredictionState();
    recordPrediction(prediction, LEFT_KEY, 1000);  // seq 0
    recordPrediction(prediction, RIGHT_KEY, 1016);  // seq 1
    recordPrediction(prediction, LEFT_KEY, 1032);   // seq 2
  });

  it('서버가 seq 1까지 확인 → seq 2만 남음', () => {
    const packet = createTestPacket({ lastInputSeq: [1, 0] });
    const remaining = reconcile(prediction, packet, 0);

    expect(remaining).toHaveLength(1);
    expect(remaining[0].seq).toBe(2);
  });

  it('서버가 모두 확인 → 빈 배열', () => {
    const packet = createTestPacket({ lastInputSeq: [2, 0] });
    const remaining = reconcile(prediction, packet, 0);
    expect(remaining).toHaveLength(0);
  });

  it('서버가 아무것도 확인 안 함 → 전부 남음', () => {
    const packet = createTestPacket({ lastInputSeq: [-1, 0] });
    const remaining = reconcile(prediction, packet, 0);
    expect(remaining).toHaveLength(3);
  });

  it('P2 기준 reconciliation', () => {
    const prediction2 = createPredictionState();
    recordPrediction(prediction2, LEFT_KEY, 1000); // seq 0
    recordPrediction(prediction2, RIGHT_KEY, 1016); // seq 1

    const packet = createTestPacket({ lastInputSeq: [0, 0] });
    const remaining = reconcile(prediction2, packet, 1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].seq).toBe(1);
  });
});

describe('WebSocket 연결 안정성 — State Interpolation', () => {
  let interp: InterpolationState;

  beforeEach(() => {
    interp = createInterpolationState();
  });

  it('초기 상태: previous/current = null', () => {
    expect(interp.previous).toBeNull();
    expect(interp.current).toBeNull();
  });

  it('상태 없을 때 interpolate → null', () => {
    expect(interpolate(interp, 0.5)).toBeNull();
  });

  it('1개 상태만 있으면 그대로 반환', () => {
    pushServerState(interp, createTestPacket({ ball: { x: 100, y: 150, vx: 0, vy: 0 } }));
    const result = interpolate(interp, 0.5);

    expect(result).not.toBeNull();
    expect(result!.ball.x).toBe(100);
    expect(result!.ball.y).toBe(150);
  });

  it('2개 상태 → t=0.5에서 중간값', () => {
    pushServerState(interp, createTestPacket({
      ball: { x: 100, y: 100, vx: 0, vy: 0 },
      players: [
        { x: 50, y: 244, vy: 0, state: 'idle' },
        { x: 300, y: 244, vy: 0, state: 'idle' },
      ],
    }));
    pushServerState(interp, createTestPacket({
      ball: { x: 200, y: 200, vx: 0, vy: 0 },
      players: [
        { x: 100, y: 244, vy: 0, state: 'idle' },
        { x: 350, y: 244, vy: 0, state: 'idle' },
      ],
    }));

    const result = interpolate(interp, 0.5)!;
    expect(result.ball.x).toBe(150);
    expect(result.ball.y).toBe(150);
    expect(result.players[0].x).toBe(75);
    expect(result.players[1].x).toBe(325);
  });

  it('t=0 → previous 값', () => {
    pushServerState(interp, createTestPacket({ ball: { x: 100, y: 100, vx: 0, vy: 0 } }));
    pushServerState(interp, createTestPacket({ ball: { x: 200, y: 200, vx: 0, vy: 0 } }));

    const result = interpolate(interp, 0)!;
    expect(result.ball.x).toBe(100);
  });

  it('t=1 → current 값', () => {
    pushServerState(interp, createTestPacket({ ball: { x: 100, y: 100, vx: 0, vy: 0 } }));
    pushServerState(interp, createTestPacket({ ball: { x: 200, y: 200, vx: 0, vy: 0 } }));

    const result = interpolate(interp, 1)!;
    expect(result.ball.x).toBe(200);
  });

  it('t가 0~1 범위 밖이면 클램핑', () => {
    pushServerState(interp, createTestPacket({ ball: { x: 100, y: 100, vx: 0, vy: 0 } }));
    pushServerState(interp, createTestPacket({ ball: { x: 200, y: 200, vx: 0, vy: 0 } }));

    const under = interpolate(interp, -1)!;
    expect(under.ball.x).toBe(100);

    const over = interpolate(interp, 2)!;
    expect(over.ball.x).toBe(200);
  });
});

describe('WebSocket 연결 안정성 — buildStatePacket', () => {
  it('게임 상태를 네트워크 패킷으로 직렬화', () => {
    const state = createInitialState();
    startGame(state);

    const buffers: [InputBuffer, InputBuffer] = [createInputBuffer(), createInputBuffer()];
    const packet = buildStatePacket(state, buffers);

    expect(packet.type).toBe('state');
    expect(packet.seq).toBe(state.tick);
    expect(packet.ball).toBeDefined();
    expect(packet.players).toHaveLength(2);
    expect(packet.score).toEqual([0, 0]);
    expect(packet.phase).toBe('serving');
  });

  it('lastInputSeq가 각 버퍼의 lastProcessedSeq 반영', () => {
    const state = createInitialState();
    startGame(state);

    const buffers: [InputBuffer, InputBuffer] = [createInputBuffer(), createInputBuffer()];
    bufferInput(buffers[0], { type: 'input', seq: 5, keys: LEFT_KEY, timestamp: 1000 });
    consumeInput(buffers[0]);

    const packet = buildStatePacket(state, buffers);
    expect(packet.lastInputSeq[0]).toBe(5);
    expect(packet.lastInputSeq[1]).toBe(-1);
  });
});

describe('WebSocket 연결 안정성 — Connection Health', () => {
  let health: ConnectionHealth;

  beforeEach(() => {
    health = createConnectionHealth();
  });

  it('초기 상태: latency=0, isHealthy=true', () => {
    expect(health.latency).toBe(0);
    expect(health.isHealthy).toBe(true);
    expect(health.reconnectAttempts).toBe(0);
  });

  it('300ms 미만 → isHealthy=true', () => {
    health.lastPingTime = 1000;
    updateConnectionHealth(health, 1200);

    expect(health.latency).toBe(200);
    expect(health.isHealthy).toBe(true);
  });

  it('300ms 이상 → isHealthy=false (LAG_WARNING_THRESHOLD_MS)', () => {
    health.lastPingTime = 1000;
    updateConnectionHealth(health, 1350);

    expect(health.latency).toBe(350);
    expect(health.isHealthy).toBe(false);
  });

  it('정확히 300ms → isHealthy=false (>= 아닌 < 비교)', () => {
    health.lastPingTime = 1000;
    updateConnectionHealth(health, 1300);

    expect(health.latency).toBe(300);
    // TIMING.LAG_WARNING_THRESHOLD_MS = 300, isHealthy = latency < 300
    expect(health.isHealthy).toBe(false);
  });

  it('LAG_WARNING_THRESHOLD_MS 상수 = 300', () => {
    expect(TIMING.LAG_WARNING_THRESHOLD_MS).toBe(300);
  });

  it('RECONNECT_TIMEOUT_MS = 5000', () => {
    expect(TIMING.RECONNECT_TIMEOUT_MS).toBe(5000);
  });

  it('RECONNECT_MAX_RETRIES = 3', () => {
    expect(TIMING.RECONNECT_MAX_RETRIES).toBe(3);
  });
});

describe('WebSocket 연결 안정성 — 프로토콜 상수 검증', () => {
  it('서버 틱 레이트 60Hz', () => {
    expect(TIMING.SERVER_TICK_RATE).toBe(60);
  });

  it('상태 브로드캐스트 레이트 30Hz', () => {
    expect(TIMING.STATE_BROADCAST_RATE).toBe(30);
  });

  it('프레임 시간 ~16.67ms', () => {
    expect(TIMING.FRAME_DURATION_MS).toBeCloseTo(16.67, 1);
  });

  it('서브 딜레이 60프레임 (1초)', () => {
    expect(TIMING.SERVE_DELAY_FRAMES).toBe(60);
  });
});
