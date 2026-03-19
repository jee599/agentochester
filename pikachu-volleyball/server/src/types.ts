// 클라이언트와 동일한 상수/타입 사용

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;
export const GROUND_Y = 360;
export const NET_X = 400;
export const NET_WIDTH = 6;
export const NET_HEIGHT = 120;
export const NET_TOP = GROUND_Y - NET_HEIGHT;

export const BALL_RADIUS = 16;
export const BALL_GRAVITY = 0.5;
export const BALL_BOUNCE = 0.75;

export const PIKACHU_WIDTH = 50;
export const PIKACHU_HEAD_RADIUS = 25;
export const PIKACHU_SPEED = 5;
export const PIKACHU_JUMP_POWER = -12;
export const PIKACHU_GRAVITY = 0.5;

export const WINNING_SCORE = 15;
export const TICK_RATE = 60;
export const TICK_INTERVAL = 1000 / TICK_RATE;

export type PlayerSide = 'left' | 'right';
export type GamePhase = 'waiting' | 'playing' | 'scored' | 'gameOver';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Pikachu {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isJumping: boolean;
  side: PlayerSide;
}

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface GameStateSync {
  ball: Ball;
  player1: Pikachu;
  player2: Pikachu;
  score: { left: number; right: number };
  phase: GamePhase;
  servingSide: PlayerSide;
}

// Client → Server
export type ClientMessage =
  | { type: 'createRoom' }
  | { type: 'joinRoom'; roomId: string }
  | { type: 'input'; input: InputState }
  | { type: 'ready' };

// Server → Client
export type ServerMessage =
  | { type: 'roomCreated'; roomId: string; side: PlayerSide }
  | { type: 'roomJoined'; roomId: string; side: PlayerSide }
  | { type: 'gameStart' }
  | { type: 'gameState'; state: GameStateSync }
  | { type: 'scored'; scorer: PlayerSide; score: { left: number; right: number } }
  | { type: 'gameOver'; winner: PlayerSide; score: { left: number; right: number } }
  | { type: 'roomList'; rooms: RoomInfo[] }
  | { type: 'opponentDisconnected' }
  | { type: 'error'; message: string };

export interface RoomInfo {
  id: string;
  playerCount: number;
}
