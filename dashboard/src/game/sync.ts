// 멀티플레이어 상태 동기화 로직
// Authoritative Server 모델: 서버가 물리 시뮬레이션 권한 보유
// Client-Side Prediction + Server Reconciliation
import type {
  ClientInput,
  ServerStatePacket,
  GameState,
  KeyState,
  Player,
} from './types';
import { TIMING } from './constants';

// --- Input Buffer (서버 측) ---

export interface InputBuffer {
  inputs: ClientInput[];
  lastProcessedSeq: number;
}

/**
 * 입력 버퍼 생성
 */
export function createInputBuffer(): InputBuffer {
  return {
    inputs: [],
    lastProcessedSeq: -1,
  };
}

/**
 * 서버: 클라이언트 입력을 버퍼에 추가
 * 중복/순서 역전 방지
 */
export function bufferInput(buffer: InputBuffer, input: ClientInput): void {
  if (input.seq <= buffer.lastProcessedSeq) return; // 이미 처리됨
  // 순서대로 삽입
  const idx = buffer.inputs.findIndex((i) => i.seq > input.seq);
  if (idx === -1) {
    buffer.inputs.push(input);
  } else {
    buffer.inputs.splice(idx, 0, input);
  }
}

/**
 * 서버: 버퍼에서 다음 입력을 꺼냄
 * 틱마다 하나씩 소비
 */
export function consumeInput(buffer: InputBuffer): KeyState | null {
  if (buffer.inputs.length === 0) return null;
  const input = buffer.inputs.shift()!;
  buffer.lastProcessedSeq = input.seq;
  return input.keys;
}

// --- Client-Side Prediction ---

export interface PredictionState {
  pendingInputs: ClientInput[];
  inputSeq: number;
  lastServerSeq: number;
}

/**
 * 클라이언트 예측 상태 생성
 */
export function createPredictionState(): PredictionState {
  return {
    pendingInputs: [],
    inputSeq: 0,
    lastServerSeq: -1,
  };
}

/**
 * 클라이언트: 입력을 서버에 전송하면서 로컬 예측 버퍼에도 저장
 */
export function recordPrediction(
  prediction: PredictionState,
  keys: KeyState,
  timestamp: number,
): ClientInput {
  const input: ClientInput = {
    type: 'input',
    seq: prediction.inputSeq++,
    keys,
    timestamp,
  };
  prediction.pendingInputs.push(input);
  return input;
}

/**
 * 클라이언트: 서버 상태 수신 시 Reconciliation
 * 1. 서버가 확인한 입력까지의 예측을 버림
 * 2. 서버 상태를 기반으로 미확인 입력을 재적용
 *
 * @returns 재적용할 미처리 입력 목록
 */
export function reconcile(
  prediction: PredictionState,
  serverPacket: ServerStatePacket,
  playerIndex: 0 | 1,
): ClientInput[] {
  const lastAcked = serverPacket.lastInputSeq[playerIndex];
  prediction.lastServerSeq = serverPacket.seq;

  // 확인된 입력 제거
  prediction.pendingInputs = prediction.pendingInputs.filter(
    (input) => input.seq > lastAcked,
  );

  return prediction.pendingInputs;
}

// --- State Interpolation ---

export interface InterpolationState {
  previous: ServerStatePacket | null;
  current: ServerStatePacket | null;
  renderTimestamp: number;
}

/**
 * 보간 상태 생성
 */
export function createInterpolationState(): InterpolationState {
  return {
    previous: null,
    current: null,
    renderTimestamp: 0,
  };
}

/**
 * 새 서버 상태를 보간 버퍼에 추가
 */
export function pushServerState(
  interp: InterpolationState,
  state: ServerStatePacket,
): void {
  interp.previous = interp.current;
  interp.current = state;
}

/**
 * 두 서버 상태 사이를 선형 보간
 * t: 0.0 (previous) ~ 1.0 (current)
 */
export function interpolate(
  interp: InterpolationState,
  t: number,
): { ball: { x: number; y: number }; players: [{ x: number; y: number }, { x: number; y: number }] } | null {
  if (!interp.previous || !interp.current) {
    if (interp.current) {
      return {
        ball: { x: interp.current.ball.x, y: interp.current.ball.y },
        players: [
          { x: interp.current.players[0].x, y: interp.current.players[0].y },
          { x: interp.current.players[1].x, y: interp.current.players[1].y },
        ],
      };
    }
    return null;
  }

  const clampedT = Math.max(0, Math.min(1, t));
  const lerp = (a: number, b: number) => a + (b - a) * clampedT;

  return {
    ball: {
      x: lerp(interp.previous.ball.x, interp.current.ball.x),
      y: lerp(interp.previous.ball.y, interp.current.ball.y),
    },
    players: [
      {
        x: lerp(interp.previous.players[0].x, interp.current.players[0].x),
        y: lerp(interp.previous.players[0].y, interp.current.players[0].y),
      },
      {
        x: lerp(interp.previous.players[1].x, interp.current.players[1].x),
        y: lerp(interp.previous.players[1].y, interp.current.players[1].y),
      },
    ],
  };
}

// --- Server State Packet Builder ---

/**
 * 서버: 현재 게임 상태를 네트워크 패킷으로 직렬화
 */
export function buildStatePacket(
  state: GameState,
  inputBuffers: [InputBuffer, InputBuffer],
): ServerStatePacket {
  return {
    type: 'state',
    seq: state.tick,
    ball: {
      x: state.ball.x,
      y: state.ball.y,
      vx: state.ball.vx,
      vy: state.ball.vy,
    },
    players: [
      {
        x: state.players[0].x,
        y: state.players[0].y,
        vy: state.players[0].vy,
        state: state.players[0].state,
      },
      {
        x: state.players[1].x,
        y: state.players[1].y,
        vy: state.players[1].vy,
        state: state.players[1].state,
      },
    ],
    score: [...state.score.scores],
    servingPlayer: state.score.servingPlayer,
    phase: state.phase,
    lastInputSeq: [
      inputBuffers[0].lastProcessedSeq,
      inputBuffers[1].lastProcessedSeq,
    ],
  };
}

// --- Connection Health ---

export interface ConnectionHealth {
  latency: number;
  lastPingTime: number;
  lastPongTime: number;
  isHealthy: boolean;
  reconnectAttempts: number;
}

/**
 * 연결 상태 초기화
 */
export function createConnectionHealth(): ConnectionHealth {
  return {
    latency: 0,
    lastPingTime: 0,
    lastPongTime: 0,
    isHealthy: true,
    reconnectAttempts: 0,
  };
}

/**
 * RTT 측정 및 건강 상태 판정
 */
export function updateConnectionHealth(
  health: ConnectionHealth,
  pongTimestamp: number,
): void {
  health.latency = pongTimestamp - health.lastPingTime;
  health.lastPongTime = pongTimestamp;
  health.isHealthy = health.latency < TIMING.LAG_WARNING_THRESHOLD_MS;
}
