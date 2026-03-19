// 충돌 판정 시스템
// 피카츄↔공, 공↔네트, 공↔바닥/벽 충돌 감지 및 반응
import { COURT, PHYSICS } from './constants';
import type { Player, Ball, CollisionResult, Vec2, KeyState } from './types';

/**
 * 두 원 사이의 충돌 판정 (피카츄-공)
 * 원작 방식: 피카츄 중심에서 공 중심으로의 벡터 방향으로 공을 반사
 */
export function checkPlayerBallCollision(
  player: Player,
  ball: Ball,
): CollisionResult | null {
  const dx = ball.x - player.x;
  const dy = ball.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = PHYSICS.PLAYER_COLLISION_RADIUS + ball.radius;

  if (dist >= minDist || dist === 0) return null;

  const nx = dx / dist;
  const ny = dy / dist;

  return {
    type: 'player_ball',
    normal: { x: nx, y: ny },
    penetration: minDist - dist,
    playerIndex: player.index,
  };
}

/**
 * 피카츄-공 충돌 반응
 * - 반사 방향 = 피카츄 중심 → 공 중심 벡터
 * - 스파이크 판정: 공중 + 캐릭터가 공보다 위
 * - 파워히트: powerHit 키 입력 시 추가 가속
 */
export function resolvePlayerBallCollision(
  player: Player,
  ball: Ball,
  collision: CollisionResult,
  isPowerHit: boolean,
): void {
  const { normal, penetration } = collision;

  // 겹침 해소 — 공을 밀어냄
  ball.x += normal.x * penetration;
  ball.y += normal.y * penetration;

  // 반사 속도 계산
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const baseSpeed = Math.max(speed, 8); // 최소 반사 속도 보장

  ball.vx = normal.x * baseSpeed;
  ball.vy = normal.y * baseSpeed;

  // 스파이크 판정: 공중 + 피카츄가 공보다 위
  const isAirborne = !player.isGrounded;
  const isAboveBall = player.y < ball.y;

  if (isAirborne && isAboveBall) {
    // 스파이크 — 강한 하향 속도 부여
    ball.vy += PHYSICS.SPIKE_POWER;
    ball.state = 'hyper';
    ball.isPowerHit = true;
    player.state = 'spike';
  } else if (isPowerHit) {
    // 파워히트 — 속도 증폭
    ball.vx *= PHYSICS.POWER_HIT_MULTIPLIER;
    ball.vy *= PHYSICS.POWER_HIT_MULTIPLIER;
    ball.state = 'punch';
    ball.isPowerHit = true;
  } else {
    ball.state = 'rotate';
    ball.isPowerHit = false;
  }

  ball.lastHitBy = player.index;
}

/**
 * 공↔네트 충돌 판정
 * 네트 = 수직 직사각형 (x: NET_X ± NET_WIDTH/2, y: NET_TOP_Y ~ GROUND_Y)
 */
export function checkBallNetCollision(ball: Ball): CollisionResult | null {
  const r = ball.radius;
  const netLeft = COURT.NET_X - COURT.NET_WIDTH / 2;
  const netRight = COURT.NET_X + COURT.NET_WIDTH / 2;
  const netTop = COURT.NET_TOP_Y;
  const netBottom = COURT.GROUND_Y;

  // 공이 네트 영역 근처에 있는지 체크
  if (ball.y + r < netTop || ball.y - r > netBottom) return null;
  if (ball.x + r < netLeft || ball.x - r > netRight) return null;

  // 네트 상단 모서리와의 충돌 (원-점 충돌)
  const cornerX = COURT.NET_X;
  const cornerY = netTop;
  const dx = ball.x - cornerX;
  const dy = ball.y - cornerY;
  const distToCorner = Math.sqrt(dx * dx + dy * dy);

  if (distToCorner < r && ball.y < netTop + r) {
    // 네트 꼭대기에 맞음
    const nx = distToCorner > 0 ? dx / distToCorner : 0;
    const ny = distToCorner > 0 ? dy / distToCorner : -1;
    return {
      type: 'ball_net',
      normal: { x: nx, y: ny },
      penetration: r - distToCorner,
    };
  }

  // 네트 측면 충돌
  let normal: Vec2;
  let penetration: number;

  if (ball.x < COURT.NET_X) {
    // 왼쪽에서 충돌
    penetration = (ball.x + r) - netLeft;
    if (penetration <= 0) return null;
    normal = { x: -1, y: 0 };
  } else {
    // 오른쪽에서 충돌
    penetration = netRight - (ball.x - r);
    if (penetration <= 0) return null;
    normal = { x: 1, y: 0 };
  }

  return { type: 'ball_net', normal, penetration };
}

/**
 * 공↔네트 충돌 반응
 */
export function resolveBallNetCollision(
  ball: Ball,
  collision: CollisionResult,
): void {
  const { normal, penetration } = collision;

  // 겹침 해소
  ball.x += normal.x * penetration;
  ball.y += normal.y * penetration;

  // 반사
  if (Math.abs(normal.x) > Math.abs(normal.y)) {
    ball.vx = -ball.vx * PHYSICS.BALL_BOUNCE_NET;
  } else {
    ball.vy = -ball.vy * PHYSICS.BALL_BOUNCE_NET;
  }
}

/**
 * 공↔바닥 충돌 판정
 */
export function checkBallFloorCollision(ball: Ball): CollisionResult | null {
  const penetration = (ball.y + ball.radius) - COURT.GROUND_Y;
  if (penetration <= 0) return null;

  return {
    type: 'ball_floor',
    normal: { x: 0, y: -1 },
    penetration,
  };
}

/**
 * 공↔바닥 충돌 반응 (바운스)
 */
export function resolveBallFloorCollision(
  ball: Ball,
  collision: CollisionResult,
): void {
  ball.y -= collision.penetration;
  ball.vy = -Math.abs(ball.vy) * PHYSICS.BALL_BOUNCE_FLOOR;
}

/**
 * 모든 충돌을 한 프레임에서 순차 처리
 */
export function processCollisions(
  players: [Player, Player],
  ball: Ball,
  inputs: [KeyState, KeyState],
): CollisionResult[] {
  const results: CollisionResult[] = [];

  // 1. 플레이어-공 충돌
  for (let i = 0; i < 2; i++) {
    const player = players[i];
    const col = checkPlayerBallCollision(player, ball);
    if (col) {
      resolvePlayerBallCollision(player, ball, col, inputs[i].powerHit);
      results.push(col);
    }
  }

  // 2. 공-네트 충돌
  const netCol = checkBallNetCollision(ball);
  if (netCol) {
    resolveBallNetCollision(ball, netCol);
    results.push(netCol);
  }

  // 3. 공-바닥 충돌 (득점 판정용으로 결과만 반환, 반응은 engine에서 처리)
  const floorCol = checkBallFloorCollision(ball);
  if (floorCol) {
    results.push(floorCol);
  }

  return results;
}
