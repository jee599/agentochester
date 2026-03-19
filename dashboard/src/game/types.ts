// 게임 엔진 타입 정의

// --- Input ---
export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  powerHit: boolean;
}

export interface ClientInput {
  type: 'input';
  seq: number;
  keys: KeyState;
  timestamp: number;
}

// --- Physics ---
export interface Vec2 {
  x: number;
  y: number;
}

export interface PhysicsBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// --- Player ---
export type PlayerAnimState =
  | 'idle'
  | 'walk'
  | 'jump_prepare'
  | 'jump_up'
  | 'jump_down'
  | 'dive_prepare'
  | 'spike'
  | 'diving'
  | 'lying_down';

export interface Player extends PhysicsBody {
  index: 0 | 1;
  state: PlayerAnimState;
  isGrounded: boolean;
  animFrame: number;
  animTimer: number;
  // 다이브(파워히트) 관련
  isDiving: boolean;
  diveCooldown: number;
}

// --- Ball ---
export type BallAnimState = 'rotate' | 'hyper' | 'punch' | 'trail';

export interface Ball extends PhysicsBody {
  radius: number;
  state: BallAnimState;
  animFrame: number;
  animTimer: number;
  isPowerHit: boolean;
  // 마지막으로 공을 친 플레이어 (서브 실패 판정용)
  lastHitBy: 0 | 1 | null;
}

// --- Game Phase ---
export type GamePhase = 'waiting' | 'serving' | 'playing' | 'scoring' | 'gameOver';

// --- Score ---
export interface ScoreState {
  scores: [number, number];
  servingPlayer: 0 | 1;
  winner: 0 | 1 | null;
}

// --- Sound Events ---
export type SoundEvent = 'ballbounce' | 'powerhit' | 'pika';

// --- Game State ---
export interface GameState {
  phase: GamePhase;
  players: [Player, Player];
  ball: Ball;
  score: ScoreState;
  tick: number;
  phaseTimer: number; // 현재 phase에서 경과한 프레임 수
  soundEvents: SoundEvent[]; // 이번 틱에서 발생한 사운드 이벤트
}

// --- Network ---
export interface ServerStatePacket {
  type: 'state';
  seq: number;
  ball: { x: number; y: number; vx: number; vy: number };
  players: [
    { x: number; y: number; vy: number; state: PlayerAnimState },
    { x: number; y: number; vy: number; state: PlayerAnimState },
  ];
  score: [number, number];
  servingPlayer: 0 | 1;
  phase: GamePhase;
  lastInputSeq: [number, number];
}

export interface CreateRoomMessage {
  type: 'createRoom';
}

export interface JoinRoomMessage {
  type: 'joinRoom';
  roomId: string;
}

export interface RoomStateMessage {
  type: 'roomState';
  roomId: string;
  players: string[];
  status: 'waiting' | 'ready' | 'playing';
}

export type NetworkMessage =
  | ClientInput
  | ServerStatePacket
  | CreateRoomMessage
  | JoinRoomMessage
  | RoomStateMessage;

// --- Collision ---
export type CollisionType =
  | 'player_ball'
  | 'ball_net'
  | 'ball_floor'
  | 'ball_wall'
  | 'ball_ceiling';

export interface CollisionResult {
  type: CollisionType;
  normal: Vec2;
  penetration: number;
  playerIndex?: 0 | 1;
}
