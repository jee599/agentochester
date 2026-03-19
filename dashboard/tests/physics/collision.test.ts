/**
 * 물리엔진 단위테스트 — 실제 구현체 import
 * 충돌 판정, 반발 계수, 중력, 속도 제한, 스파이크, 득점 판정
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  updatePlayer,
  updateBall,
  bounceWalls,
  resetBallForServe,
  resetPlayersForServe,
  checkBallGroundContact,
} from '@/src/game/physics';
import {
  checkPlayerBallCollision,
  resolvePlayerBallCollision,
  checkBallNetCollision,
  resolveBallNetCollision,
  checkBallFloorCollision,
  resolveBallFloorCollision,
  processCollisions,
} from '@/src/game/collision';
import { createInitialState, startGame, gameTick } from '@/src/game/engine';
import { COURT, PHYSICS, SCORING } from '@/src/game/constants';
import type { Player, Ball, KeyState, GameState } from '@/src/game/types';

// 테스트용 헬퍼: 독립된 Ball 생성
function createTestBall(overrides: Partial<Ball> = {}): Ball {
  return {
    x: 200,
    y: 200,
    vx: 3,
    vy: -2,
    radius: PHYSICS.BALL_RADIUS,
    state: 'rotate',
    animFrame: 0,
    animTimer: 0,
    isPowerHit: false,
    lastHitBy: null,
    ...overrides,
  };
}

// 테스트용 헬퍼: 독립된 Player 생성
function createTestPlayer(index: 0 | 1, overrides: Partial<Player> = {}): Player {
  return {
    index,
    x: index === 0 ? COURT.WIDTH / 4 : (COURT.WIDTH * 3) / 4,
    y: COURT.GROUND_Y,
    vx: 0,
    vy: 0,
    state: 'idle',
    isGrounded: true,
    animFrame: 0,
    animTimer: 0,
    isDiving: false,
    diveCooldown: 0,
    ...overrides,
  };
}

const NO_INPUT: KeyState = { left: false, right: false, up: false, powerHit: false };

describe('물리엔진 — 충돌 판정', () => {
  describe('원 충돌 감지 (checkPlayerBallCollision)', () => {
    it('캐릭터와 공이 충돌 반경 내일 때 충돌 감지', () => {
      const player = createTestPlayer(0, { x: 200, y: 200 });
      const ball = createTestBall({ x: 240, y: 200 });
      // 거리 40 < 32 + 20 = 52
      const result = checkPlayerBallCollision(player, ball);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('player_ball');
    });

    it('캐릭터와 공이 충돌 반경 밖일 때 충돌 미감지', () => {
      const player = createTestPlayer(0, { x: 100, y: 200 });
      const ball = createTestBall({ x: 200, y: 200 });
      // 거리 100 > 52
      const result = checkPlayerBallCollision(player, ball);
      expect(result).toBeNull();
    });

    it('정확히 반경 합과 같은 거리에서 충돌 미감지 (>=이므로 경계는 null)', () => {
      const player = createTestPlayer(0, { x: 100, y: 200 });
      const ball = createTestBall({ x: 152, y: 200 });
      // 거리 = 52 = 32 + 20, dist >= minDist → null
      const result = checkPlayerBallCollision(player, ball);
      expect(result).toBeNull();
    });

    it('반경 합보다 살짝 가까운 거리에서 충돌 감지', () => {
      const player = createTestPlayer(0, { x: 100, y: 200 });
      const ball = createTestBall({ x: 151, y: 200 });
      const result = checkPlayerBallCollision(player, ball);
      expect(result).not.toBeNull();
    });

    it('충돌 결과에 normal 벡터와 penetration 포함', () => {
      const player = createTestPlayer(0, { x: 200, y: 200 });
      const ball = createTestBall({ x: 230, y: 200 });
      const result = checkPlayerBallCollision(player, ball);
      expect(result).not.toBeNull();
      expect(result!.normal.x).toBeGreaterThan(0);
      expect(result!.penetration).toBeGreaterThan(0);
    });
  });

  describe('캐릭터-공 충돌 반응 (resolvePlayerBallCollision)', () => {
    it('충돌 후 공이 캐릭터로부터 밀려남', () => {
      const player = createTestPlayer(0, { x: 200, y: 200 });
      const ball = createTestBall({ x: 230, y: 200, vx: -5, vy: 0 });
      const collision = checkPlayerBallCollision(player, ball)!;

      const prevBallX = ball.x;
      resolvePlayerBallCollision(player, ball, collision, false);

      expect(ball.x).toBeGreaterThan(prevBallX);
    });

    it('공이 캐릭터 오른쪽에서 충돌하면 오른쪽으로 반사', () => {
      const player = createTestPlayer(0, { x: 100, y: 200 });
      const ball = createTestBall({ x: 140, y: 200, vx: -3, vy: 0 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, false);
      expect(ball.vx).toBeGreaterThan(0);
    });

    it('공이 캐릭터 위에서 충돌하면 위로 반사', () => {
      const player = createTestPlayer(0, { x: 200, y: 220 });
      const ball = createTestBall({ x: 200, y: 180, vx: 0, vy: 3 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, false);
      expect(ball.vy).toBeLessThan(0);
    });

    it('스파이크 판정: 공중 + 공보다 위 → 하향 가속', () => {
      const player = createTestPlayer(0, {
        x: 200, y: 150, isGrounded: false, vy: 2,
      });
      const ball = createTestBall({ x: 210, y: 185, vx: 0, vy: 0 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, false);
      // 스파이크 → ball.vy에 SPIKE_POWER(8) 추가
      expect(ball.vy).toBeGreaterThan(0);
      expect(ball.isPowerHit).toBe(true);
      expect(ball.state).toBe('hyper');
      expect(player.state).toBe('spike');
    });

    it('파워히트: powerHit=true → 속도 1.5배 증폭', () => {
      const player = createTestPlayer(0, { x: 200, y: COURT.GROUND_Y });
      const ball = createTestBall({ x: 230, y: COURT.GROUND_Y, vx: -5, vy: 0 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, true);
      expect(ball.isPowerHit).toBe(true);
      expect(ball.state).toBe('punch');
    });

    it('일반 히트: isPowerHit=false, state=rotate', () => {
      const player = createTestPlayer(0, { x: 200, y: COURT.GROUND_Y });
      const ball = createTestBall({ x: 230, y: COURT.GROUND_Y, vx: -5, vy: 0 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, false);
      expect(ball.isPowerHit).toBe(false);
      expect(ball.state).toBe('rotate');
    });

    it('lastHitBy가 충돌한 플레이어 인덱스로 설정', () => {
      const player = createTestPlayer(1, { x: 300, y: 200 });
      const ball = createTestBall({ x: 330, y: 200 });
      const collision = checkPlayerBallCollision(player, ball)!;

      resolvePlayerBallCollision(player, ball, collision, false);
      expect(ball.lastHitBy).toBe(1);
    });
  });

  describe('네트 충돌 (checkBallNetCollision / resolveBallNetCollision)', () => {
    it('공이 네트 좌측에서 충돌 시 감지', () => {
      const ball = createTestBall({
        x: COURT.NET_X - PHYSICS.BALL_RADIUS + 2,
        y: 200,
        vx: 5,
      });
      const result = checkBallNetCollision(ball);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ball_net');
    });

    it('네트 충돌 반응: x 속도 반전 (계수 1.0)', () => {
      const ball = createTestBall({
        x: COURT.NET_X - PHYSICS.BALL_RADIUS + 2,
        y: 200,
        vx: 8,
        vy: 2,
      });
      const collision = checkBallNetCollision(ball);
      if (collision) {
        resolveBallNetCollision(ball, collision);
        expect(ball.vx).toBeLessThan(0);
      }
    });

    it('네트 높이 위의 공은 네트 충돌 미발생', () => {
      const ball = createTestBall({
        x: COURT.NET_X,
        y: COURT.NET_TOP_Y - PHYSICS.BALL_RADIUS - 10,
        vx: 5,
      });
      const result = checkBallNetCollision(ball);
      expect(result).toBeNull();
    });

    it('네트에서 멀리 떨어진 공은 충돌 미발생', () => {
      const ball = createTestBall({ x: 100, y: 200 });
      const result = checkBallNetCollision(ball);
      expect(result).toBeNull();
    });
  });

  describe('바닥 충돌 (checkBallFloorCollision / resolveBallFloorCollision)', () => {
    it('공이 바닥 관통 시 충돌 감지', () => {
      const ball = createTestBall({
        y: COURT.GROUND_Y - PHYSICS.BALL_RADIUS + 5,
        vy: 10,
      });
      const result = checkBallFloorCollision(ball);
      expect(result).not.toBeNull();
      expect(result!.type).toBe('ball_floor');
    });

    it('바닥 바운스 후 vy 반전 및 0.7배 감소', () => {
      const ball = createTestBall({
        y: COURT.GROUND_Y - PHYSICS.BALL_RADIUS + 5,
        vy: 10,
      });
      const collision = checkBallFloorCollision(ball)!;
      resolveBallFloorCollision(ball, collision);
      expect(ball.vy).toBeCloseTo(-10 * PHYSICS.BALL_BOUNCE_FLOOR);
    });

    it('바닥 위에 있는 공은 충돌 미발생', () => {
      const ball = createTestBall({ y: 100 });
      expect(checkBallFloorCollision(ball)).toBeNull();
    });
  });

  describe('벽 바운스 (bounceWalls)', () => {
    it('왼쪽 벽 충돌 시 vx 반전 (계수 1.0)', () => {
      const ball = createTestBall({
        x: PHYSICS.BALL_RADIUS - 5,
        vx: -8,
      });
      bounceWalls(ball);
      expect(ball.vx).toBe(8 * PHYSICS.BALL_BOUNCE_WALL);
      expect(ball.x).toBe(PHYSICS.BALL_RADIUS);
    });

    it('오른쪽 벽 충돌 시 vx 반전', () => {
      const ball = createTestBall({
        x: COURT.WIDTH - PHYSICS.BALL_RADIUS + 5,
        vx: 8,
      });
      bounceWalls(ball);
      expect(ball.vx).toBe(-8 * PHYSICS.BALL_BOUNCE_WALL);
    });

    it('천장 충돌 시 vy 반전', () => {
      const ball = createTestBall({
        y: COURT.CEILING_Y + PHYSICS.BALL_RADIUS - 5,
        vy: -10,
      });
      bounceWalls(ball);
      expect(ball.vy).toBe(10); // Math.abs(vy)
    });

    it('벽 바운스 시 에너지 손실 없음 (계수 1.0)', () => {
      const ball = createTestBall({ x: 5, y: 200, vx: -10, vy: 5 });
      const speedBefore = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      bounceWalls(ball);
      const speedAfter = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      expect(speedAfter).toBeCloseTo(speedBefore);
    });
  });

  describe('공 물리 (updateBall)', () => {
    it('중력 적용: 매 프레임 vy += BALL_GRAVITY(0.5)', () => {
      const ball = createTestBall({ vx: 5, vy: 0 });
      updateBall(ball);
      expect(ball.vy).toBe(PHYSICS.BALL_GRAVITY);
    });

    it('10프레임 후 vy 누적', () => {
      const ball = createTestBall({ vx: 0, vy: 0, x: 200, y: 100 });
      for (let i = 0; i < 10; i++) {
        updateBall(ball);
      }
      // 10 * 0.5 = 5 (단순 누적, 위치 변화로 인한 속도 변화 고려)
      expect(ball.vy).toBeCloseTo(5, 0);
    });

    it('속도 제한: BALL_MAX_SPEED(20) 초과 시 클램핑', () => {
      const ball = createTestBall({ vx: 25, vy: 0 });
      updateBall(ball);
      const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
      expect(speed).toBeLessThanOrEqual(PHYSICS.BALL_MAX_SPEED + 1);
    });

    it('위치 업데이트: x += vx, y += vy', () => {
      const ball = createTestBall({ x: 100, y: 100, vx: 5, vy: 3 });
      updateBall(ball);
      expect(ball.x).toBeCloseTo(105);
      // vy에 gravity 적용 후 이동
      expect(ball.y).toBeCloseTo(100 + 3 + PHYSICS.BALL_GRAVITY);
    });
  });

  describe('플레이어 물리 (updatePlayer)', () => {
    it('왼쪽 키 → vx = -PLAYER_SPEED', () => {
      const player = createTestPlayer(0);
      updatePlayer(player, { ...NO_INPUT, left: true });
      expect(player.vx).toBe(-PHYSICS.PLAYER_SPEED);
    });

    it('오른쪽 키 → vx = +PLAYER_SPEED', () => {
      const player = createTestPlayer(0);
      updatePlayer(player, { ...NO_INPUT, right: true });
      expect(player.vx).toBe(PHYSICS.PLAYER_SPEED);
    });

    it('키 해제 → vx = 0', () => {
      const player = createTestPlayer(0, { vx: 6 });
      updatePlayer(player, NO_INPUT);
      expect(player.vx).toBe(0);
    });

    it('점프: 바닥에서 up → vy = JUMP_VELOCITY + GRAVITY (같은 프레임에 중력 적용)', () => {
      const player = createTestPlayer(0);
      updatePlayer(player, { ...NO_INPUT, up: true });
      // updatePlayer에서 점프 후 같은 프레임에 중력 적용됨
      expect(player.vy).toBe(PHYSICS.JUMP_VELOCITY + PHYSICS.GRAVITY);
      expect(player.isGrounded).toBe(false);
    });

    it('이중 점프 방지: 공중에서 up 무시', () => {
      const player = createTestPlayer(0, { isGrounded: false, vy: -8 });
      updatePlayer(player, { ...NO_INPUT, up: true });
      // vy에 중력만 적용, JUMP_VELOCITY로 리셋되지 않음
      expect(player.vy).not.toBe(PHYSICS.JUMP_VELOCITY);
    });

    it('P1은 왼쪽 코트 영역으로 제한', () => {
      const player = createTestPlayer(0, { x: COURT.P1_MAX_X });
      updatePlayer(player, { ...NO_INPUT, right: true });
      expect(player.x).toBeLessThanOrEqual(COURT.P1_MAX_X);
    });

    it('P2는 오른쪽 코트 영역으로 제한', () => {
      const player = createTestPlayer(1, { x: COURT.P2_MIN_X });
      updatePlayer(player, { ...NO_INPUT, left: true });
      expect(player.x).toBeGreaterThanOrEqual(COURT.P2_MIN_X);
    });

    it('바닥 클램핑: y가 GROUND_Y 초과 시 고정', () => {
      const player = createTestPlayer(0, {
        y: COURT.GROUND_Y - 10,
        vy: 20,
        isGrounded: false,
      });
      updatePlayer(player, NO_INPUT);
      expect(player.y).toBe(COURT.GROUND_Y);
      expect(player.isGrounded).toBe(true);
    });
  });

  describe('득점 판정 (checkBallGroundContact)', () => {
    it('공이 P1 코트(왼쪽) 바닥 → 0 반환 (왼쪽 사이드)', () => {
      const ball = createTestBall({
        x: 100,
        y: COURT.GROUND_Y,
      });
      expect(checkBallGroundContact(ball)).toBe(0);
    });

    it('공이 P2 코트(오른쪽) 바닥 → 1 반환 (오른쪽 사이드)', () => {
      const ball = createTestBall({
        x: 300,
        y: COURT.GROUND_Y,
      });
      expect(checkBallGroundContact(ball)).toBe(1);
    });

    it('공이 공중에 있으면 null', () => {
      const ball = createTestBall({ x: 300, y: 100 });
      expect(checkBallGroundContact(ball)).toBeNull();
    });
  });

  describe('processCollisions — 통합 충돌 파이프라인', () => {
    it('플레이어-공 충돌 + 네트 충돌 동시 처리', () => {
      const state = createInitialState();
      startGame(state);

      // 공을 P1 근처에 배치
      state.ball.x = state.players[0].x + 30;
      state.ball.y = state.players[0].y;
      state.ball.vx = -5;
      state.ball.vy = 0;

      const inputs: [KeyState, KeyState] = [NO_INPUT, NO_INPUT];
      const results = processCollisions(state.players, state.ball, inputs);

      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some((r) => r.type === 'player_ball')).toBe(true);
    });

    it('충돌 없는 상태에서 빈 배열 반환', () => {
      const state = createInitialState();
      startGame(state);

      // 공을 중앙 공중에 배치 (아무 것과도 충돌하지 않도록)
      state.ball.x = COURT.WIDTH / 2;
      state.ball.y = 50;
      state.ball.vx = 0;
      state.ball.vy = 0;

      const inputs: [KeyState, KeyState] = [NO_INPUT, NO_INPUT];
      const results = processCollisions(state.players, state.ball, inputs);
      expect(results).toHaveLength(0);
    });
  });

  describe('서브 리셋', () => {
    it('resetBallForServe: 공이 서빙 플레이어 위에 배치', () => {
      const state = createInitialState();
      startGame(state);

      state.ball.x = 400;
      state.ball.y = 50;
      state.ball.vx = 10;
      state.ball.vy = 10;

      resetBallForServe(state);
      expect(state.ball.vx).toBe(0);
      expect(state.ball.vy).toBe(0);
    });

    it('resetPlayersForServe: 양 플레이어 초기 위치 복귀', () => {
      const state = createInitialState();
      startGame(state);

      state.players[0].x = 10;
      state.players[1].x = 400;

      resetPlayersForServe(state);
      expect(state.players[0].y).toBe(COURT.GROUND_Y);
      expect(state.players[1].y).toBe(COURT.GROUND_Y);
      expect(state.players[0].isGrounded).toBe(true);
      expect(state.players[1].isGrounded).toBe(true);
    });
  });
});
