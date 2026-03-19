// 원작 피카츄 배구(1997) 기반 게임 상수
// animations.json의 gameConstants와 동기화

export const COURT = {
  WIDTH: 432,
  HEIGHT: 304,
  GROUND_Y: 244,
  NET_X: 216,
  NET_TOP_Y: 160,
  CEILING_Y: 0,
  NET_WIDTH: 8,
  // 각 플레이어의 이동 가능 영역
  P1_MIN_X: 32, // 왼쪽 벽 + 반캐릭터
  P1_MAX_X: 216 - 4, // 네트 왼쪽 경계
  P2_MIN_X: 216 + 4, // 네트 오른쪽 경계
  P2_MAX_X: 432 - 32, // 오른쪽 벽 - 반캐릭터
} as const;

export const PHYSICS = {
  GRAVITY: 1,
  PLAYER_SPEED: 6,
  JUMP_VELOCITY: -16,
  BALL_GRAVITY: 0.5,
  BALL_MAX_SPEED: 20,
  BALL_RADIUS: 20,
  PLAYER_WIDTH: 64,
  PLAYER_HEIGHT: 64,
  PLAYER_HALF_WIDTH: 32,
  PLAYER_COLLISION_RADIUS: 32,
  // 공 반발 계수
  BALL_BOUNCE_FLOOR: 0.7,
  BALL_BOUNCE_WALL: 1.0,
  BALL_BOUNCE_NET: 1.0,
  // 스파이크
  SPIKE_POWER: 8,
  POWER_HIT_MULTIPLIER: 1.5,
} as const;

export const SCORING = {
  MAX_SCORE: 15,
  WIN_BY: 1,
} as const;

export const TIMING = {
  FPS: 60,
  FRAME_DURATION_MS: 1000 / 60, // ~16.67ms
  SERVER_TICK_RATE: 60, // Hz
  STATE_BROADCAST_RATE: 30, // Hz
  SERVE_DELAY_FRAMES: 60, // 서브 전 대기 (1초)
  SCORE_DISPLAY_FRAMES: 90, // 득점 후 연출 (1.5초)
  RECONNECT_TIMEOUT_MS: 5000,
  RECONNECT_MAX_RETRIES: 3,
  LAG_WARNING_THRESHOLD_MS: 300,
} as const;

// 서브 시 공 초기 위치 (서브 플레이어 기준 머리 위)
export const SERVE_BALL_OFFSET_Y = -40;

// 공 초기 위치 (각 플레이어 코트 중앙)
export const SERVE_POSITIONS = {
  P1: { x: COURT.WIDTH / 4, y: COURT.GROUND_Y },
  P2: { x: (COURT.WIDTH * 3) / 4, y: COURT.GROUND_Y },
} as const;
