// 2D 물리엔진 — 중력, 속도, 위치 업데이트
import { COURT, PHYSICS, SERVE_POSITIONS, SERVE_BALL_OFFSET_Y } from './constants';
import type { Player, Ball, KeyState, GameState } from './types';

/**
 * 플레이어 물리 업데이트 (매 프레임)
 * - 입력 기반 수평 이동
 * - 점프 / 중력
 * - 바닥 클램핑
 * - 코트 영역 제한
 */
export function updatePlayer(player: Player, keys: KeyState): void {
  const isP1 = player.index === 0;
  const minX = isP1 ? COURT.P1_MIN_X : COURT.P2_MIN_X;
  const maxX = isP1 ? COURT.P1_MAX_X : COURT.P2_MAX_X;

  // 수평 이동
  if (keys.left) {
    player.vx = -PHYSICS.PLAYER_SPEED;
  } else if (keys.right) {
    player.vx = PHYSICS.PLAYER_SPEED;
  } else {
    player.vx = 0;
  }

  // 점프 (바닥에 있을 때만)
  if (keys.up && player.isGrounded) {
    player.vy = PHYSICS.JUMP_VELOCITY;
    player.isGrounded = false;
  }

  // 중력 적용
  if (!player.isGrounded) {
    player.vy += PHYSICS.GRAVITY;
  }

  // 위치 업데이트
  player.x += player.vx;
  player.y += player.vy;

  // 바닥 클램핑
  if (player.y >= COURT.GROUND_Y) {
    player.y = COURT.GROUND_Y;
    player.vy = 0;
    player.isGrounded = true;
  }

  // 좌우 영역 제한
  player.x = Math.max(minX, Math.min(maxX, player.x));
}

/**
 * 공 물리 업데이트 (매 프레임)
 * - 중력 적용
 * - 속도 제한
 * - 위치 업데이트
 */
export function updateBall(ball: Ball): void {
  // 중력
  ball.vy += PHYSICS.BALL_GRAVITY;

  // 속도 제한
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > PHYSICS.BALL_MAX_SPEED) {
    const scale = PHYSICS.BALL_MAX_SPEED / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }

  // 위치 업데이트
  ball.x += ball.vx;
  ball.y += ball.vy;
}

/**
 * 벽/천장 바운스 처리
 */
export function bounceWalls(ball: Ball): void {
  const r = ball.radius;

  // 왼쪽 벽
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = Math.abs(ball.vx) * PHYSICS.BALL_BOUNCE_WALL;
  }
  // 오른쪽 벽
  if (ball.x + r > COURT.WIDTH) {
    ball.x = COURT.WIDTH - r;
    ball.vx = -Math.abs(ball.vx) * PHYSICS.BALL_BOUNCE_WALL;
  }
  // 천장
  if (ball.y - r < COURT.CEILING_Y) {
    ball.y = COURT.CEILING_Y + r;
    ball.vy = Math.abs(ball.vy);
  }
}

/**
 * 서브 시 공 초기 위치 설정
 */
export function resetBallForServe(state: GameState): void {
  const servingPlayer = state.score.servingPlayer;
  const servePos = servingPlayer === 0 ? SERVE_POSITIONS.P1 : SERVE_POSITIONS.P2;

  state.ball.x = servePos.x;
  state.ball.y = servePos.y + SERVE_BALL_OFFSET_Y;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.ball.isPowerHit = false;
  state.ball.lastHitBy = null;
  state.ball.state = 'rotate';
}

/**
 * 플레이어 서브 위치 초기화
 */
export function resetPlayersForServe(state: GameState): void {
  // P1: 왼쪽 코트 중앙
  state.players[0].x = SERVE_POSITIONS.P1.x;
  state.players[0].y = COURT.GROUND_Y;
  state.players[0].vx = 0;
  state.players[0].vy = 0;
  state.players[0].isGrounded = true;
  state.players[0].state = 'idle';

  // P2: 오른쪽 코트 중앙
  state.players[1].x = SERVE_POSITIONS.P2.x;
  state.players[1].y = COURT.GROUND_Y;
  state.players[1].vx = 0;
  state.players[1].vy = 0;
  state.players[1].isGrounded = true;
  state.players[1].state = 'idle';
}

/**
 * 공이 바닥에 닿았는지 확인 (득점 판정 트리거)
 * 어느 쪽 코트에 닿았는지 반환
 */
export function checkBallGroundContact(ball: Ball): 0 | 1 | null {
  if (ball.y + ball.radius >= COURT.GROUND_Y) {
    return ball.x < COURT.NET_X ? 0 : 1;
  }
  return null;
}
