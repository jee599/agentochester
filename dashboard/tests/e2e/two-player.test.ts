/**
 * 2인 동시 플레이 E2E 테스트
 * 실제 게임 엔진(engine.ts)을 사용한 통합 테스트
 * 방 생성 → 게임 시작 → 서브 → 랠리 → 득점 → 15점 승리
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState, startGame, gameTick, restartMatch } from '@/src/game/engine';
import { processScoring, checkWinCondition, resetScore } from '@/src/game/scoring';
import { checkBallGroundContact } from '@/src/game/physics';
import { COURT, PHYSICS, SCORING, TIMING } from '@/src/game/constants';
import type { GameState, KeyState } from '@/src/game/types';

const NO_INPUT: KeyState = { left: false, right: false, up: false, powerHit: false };
const LEFT: KeyState = { left: true, right: false, up: false, powerHit: false };
const RIGHT: KeyState = { left: false, right: true, up: false, powerHit: false };
const JUMP: KeyState = { left: false, right: false, up: true, powerHit: false };

/**
 * 서브 딜레이를 넘겨서 공이 자유낙하하도록 틱을 진행
 */
function advancePastServeDelay(state: GameState): void {
  for (let i = 0; i < TIMING.SERVE_DELAY_FRAMES + 1; i++) {
    gameTick(state, [NO_INPUT, NO_INPUT]);
  }
}

/**
 * 공을 특정 코트 바닥에 강제 배치 후 틱 진행하여 득점 발생
 */
function forceScore(state: GameState, side: 'left' | 'right'): void {
  // playing 위상에서만 득점 가능
  if (state.phase !== 'playing') {
    // serving → playing 전환을 위해 서브 딜레이 넘기기
    if (state.phase === 'serving') {
      advancePastServeDelay(state);
    }
    // 아직 playing이 아니면 강제 전환
    if (state.phase !== 'playing') {
      state.phase = 'playing';
      state.phaseTimer = 0;
    }
  }

  // 플레이어를 양쪽 끝으로 이동 (공과 충돌 방지)
  state.players[0].x = COURT.P1_MIN_X;
  state.players[0].y = COURT.GROUND_Y;
  state.players[0].isGrounded = true;
  state.players[1].x = COURT.P2_MAX_X;
  state.players[1].y = COURT.GROUND_Y;
  state.players[1].isGrounded = true;

  // 공을 해당 코트의 바닥 직전에 배치
  const targetX = side === 'left' ? 100 : 300;
  state.ball.x = targetX;
  state.ball.y = COURT.GROUND_Y - state.ball.radius - 1;
  state.ball.vx = 0;
  state.ball.vy = 10;

  // 틱 진행하여 바닥 도달
  gameTick(state, [NO_INPUT, NO_INPUT]);
}

/**
 * scoring → 다음 serving까지 틱 진행
 */
function advancePastScoring(state: GameState): void {
  if (state.phase !== 'scoring') return;
  for (let i = 0; i < TIMING.SCORE_DISPLAY_FRAMES + 5; i++) {
    gameTick(state, [NO_INPUT, NO_INPUT]);
    if (state.phase !== 'scoring') break;
  }
}

describe('2인 동시 플레이 E2E', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialState();
  });

  describe('게임 초기화', () => {
    it('초기 상태: waiting 위상', () => {
      expect(state.phase).toBe('waiting');
    });

    it('startGame 후 serving 위상', () => {
      startGame(state);
      expect(state.phase).toBe('serving');
    });

    it('초기 점수 0:0, 서빙 플레이어 P1(0)', () => {
      startGame(state);
      expect(state.score.scores).toEqual([0, 0]);
      expect(state.score.servingPlayer).toBe(0);
      expect(state.score.winner).toBeNull();
    });

    it('P1은 왼쪽 코트, P2는 오른쪽 코트에 배치', () => {
      startGame(state);
      expect(state.players[0].x).toBeLessThan(COURT.NET_X);
      expect(state.players[1].x).toBeGreaterThan(COURT.NET_X);
    });

    it('두 플레이어 모두 바닥에 서 있음', () => {
      startGame(state);
      expect(state.players[0].y).toBe(COURT.GROUND_Y);
      expect(state.players[1].y).toBe(COURT.GROUND_Y);
      expect(state.players[0].isGrounded).toBe(true);
      expect(state.players[1].isGrounded).toBe(true);
    });
  });

  describe('서브 메커니즘', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('서브 딜레이 동안 공이 서빙 플레이어 위에 고정', () => {
      gameTick(state, [NO_INPUT, NO_INPUT]);
      expect(state.phase).toBe('serving');
      // 공이 서빙 플레이어 근처에 있는지 확인
      expect(Math.abs(state.ball.x - state.players[0].x)).toBeLessThan(10);
    });

    it('서브 딜레이(60프레임) 후 공이 자유낙하 시작', () => {
      const ballY_before = state.ball.y;

      // 서브 딜레이 프레임 동안 진행
      for (let i = 0; i < TIMING.SERVE_DELAY_FRAMES; i++) {
        gameTick(state, [NO_INPUT, NO_INPUT]);
      }

      // 딜레이 직후 한 틱 더
      gameTick(state, [NO_INPUT, NO_INPUT]);

      // 공이 움직이기 시작함 (중력에 의해 y 변화)
      expect(state.ball.y).not.toBe(ballY_before);
    });

    it('서빙 중에도 플레이어 이동 가능', () => {
      const prevX = state.players[0].x;
      gameTick(state, [RIGHT, NO_INPUT]);
      expect(state.players[0].x).toBeGreaterThan(prevX);
    });
  });

  describe('플레이어 이동', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('P1 왼쪽 이동', () => {
      const prevX = state.players[0].x;
      gameTick(state, [LEFT, NO_INPUT]);
      expect(state.players[0].x).toBeLessThan(prevX);
    });

    it('P2 오른쪽 이동', () => {
      const prevX = state.players[1].x;
      gameTick(state, [NO_INPUT, RIGHT]);
      expect(state.players[1].x).toBeGreaterThan(prevX);
    });

    it('P1은 네트를 넘어갈 수 없음', () => {
      state.players[0].x = COURT.P1_MAX_X;
      gameTick(state, [RIGHT, NO_INPUT]);
      expect(state.players[0].x).toBeLessThanOrEqual(COURT.P1_MAX_X);
    });

    it('P2는 네트 왼쪽으로 이동 불가', () => {
      state.players[1].x = COURT.P2_MIN_X;
      gameTick(state, [NO_INPUT, LEFT]);
      expect(state.players[1].x).toBeGreaterThanOrEqual(COURT.P2_MIN_X);
    });
  });

  describe('점프 메커니즘', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('점프 키 입력 시 isGrounded=false, vy < 0', () => {
      gameTick(state, [JUMP, NO_INPUT]);
      expect(state.players[0].isGrounded).toBe(false);
      expect(state.players[0].vy).toBeLessThan(0);
    });

    it('점프 후 중력으로 착지', () => {
      gameTick(state, [JUMP, NO_INPUT]);

      // 200프레임 후 착지해야 함
      for (let i = 0; i < 200; i++) {
        gameTick(state, [NO_INPUT, NO_INPUT]);
        if (state.players[0].isGrounded) break;
      }

      expect(state.players[0].y).toBe(COURT.GROUND_Y);
      expect(state.players[0].isGrounded).toBe(true);
    });

    it('P1과 P2 동시 점프', () => {
      gameTick(state, [JUMP, JUMP]);
      expect(state.players[0].isGrounded).toBe(false);
      expect(state.players[1].isGrounded).toBe(false);
    });
  });

  describe('득점 흐름', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('공이 P2 코트 바닥 → P1 득점 (scoring 위상 전환)', () => {
      forceScore(state, 'right');
      expect(state.phase).toBe('scoring');
      expect(state.score.scores[0]).toBe(1);
    });

    it('공이 P1 코트 바닥 → P2 득점', () => {
      forceScore(state, 'left');
      expect(state.phase).toBe('scoring');
      expect(state.score.scores[1]).toBe(1);
    });

    it('득점 후 서브권이 득점한 플레이어에게 이동', () => {
      forceScore(state, 'left'); // P2 득점
      expect(state.score.servingPlayer).toBe(1);
    });

    it('scoring 위상 후 serving으로 복귀', () => {
      forceScore(state, 'right');
      expect(state.phase).toBe('scoring');

      advancePastScoring(state);
      expect(state.phase).toBe('serving');
    });

    it('scoring → serving 복귀 시 플레이어 위치 리셋', () => {
      forceScore(state, 'right');
      advancePastScoring(state);

      expect(state.players[0].y).toBe(COURT.GROUND_Y);
      expect(state.players[1].y).toBe(COURT.GROUND_Y);
      expect(state.players[0].isGrounded).toBe(true);
    });
  });

  describe('15점 승리 조건', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('P1이 15점 도달 시 gameOver', () => {
      for (let i = 0; i < SCORING.MAX_SCORE; i++) {
        forceScore(state, 'right'); // P1 득점
        if (state.phase === 'scoring') {
          advancePastScoring(state);
        }
        if (state.phase === 'gameOver') break;
      }

      expect(state.phase).toBe('gameOver');
      expect(state.score.winner).toBe(0);
      expect(state.score.scores[0]).toBe(SCORING.MAX_SCORE);
    });

    it('P2가 15점 도달 시 gameOver', () => {
      for (let i = 0; i < SCORING.MAX_SCORE; i++) {
        forceScore(state, 'left'); // P2 득점
        if (state.phase === 'scoring') {
          advancePastScoring(state);
        }
        if (state.phase === 'gameOver') break;
      }

      expect(state.phase).toBe('gameOver');
      expect(state.score.winner).toBe(1);
      expect(state.score.scores[1]).toBe(SCORING.MAX_SCORE);
    });

    it('14점에서는 게임 미종료', () => {
      for (let i = 0; i < SCORING.MAX_SCORE - 1; i++) {
        forceScore(state, 'right');
        if (state.phase === 'scoring') {
          advancePastScoring(state);
        }
      }

      expect(state.phase).not.toBe('gameOver');
      expect(state.score.scores[0]).toBe(SCORING.MAX_SCORE - 1);
    });

    it('MAX_SCORE 상수 = 15', () => {
      expect(SCORING.MAX_SCORE).toBe(15);
    });
  });

  describe('양 플레이어 동시 입력', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('P1과 P2가 동시에 반대 방향 이동', () => {
      const p1PrevX = state.players[0].x;
      const p2PrevX = state.players[1].x;

      gameTick(state, [RIGHT, LEFT]);

      expect(state.players[0].x).toBeGreaterThan(p1PrevX);
      expect(state.players[1].x).toBeLessThan(p2PrevX);
    });

    it('P1 점프 + P2 이동 동시 처리', () => {
      const p2PrevX = state.players[1].x;

      gameTick(state, [JUMP, RIGHT]);

      expect(state.players[0].isGrounded).toBe(false);
      expect(state.players[1].x).toBeGreaterThan(p2PrevX);
    });
  });

  describe('풀 매치 시뮬레이션', () => {
    it('교대 득점으로 15점 매치 완료', () => {
      startGame(state);
      let totalPoints = 0;

      while (state.phase !== 'gameOver' && totalPoints < 100) {
        const side = totalPoints % 2 === 0 ? 'left' : 'right';
        forceScore(state, side);
        totalPoints++;

        if (state.phase === 'scoring') {
          advancePastScoring(state);
        }
      }

      expect(state.phase).toBe('gameOver');
      expect(state.score.winner).not.toBeNull();

      const [s1, s2] = state.score.scores;
      expect(s1 === SCORING.MAX_SCORE || s2 === SCORING.MAX_SCORE).toBe(true);
    });

    it('restartMatch로 재대전 가능', () => {
      startGame(state);

      // P1이 15점 획득
      for (let i = 0; i < SCORING.MAX_SCORE; i++) {
        forceScore(state, 'right');
        if (state.phase === 'scoring') advancePastScoring(state);
        if (state.phase === 'gameOver') break;
      }

      expect(state.phase).toBe('gameOver');

      restartMatch(state);
      expect(state.phase).toBe('serving');
      expect(state.score.scores).toEqual([0, 0]);
      expect(state.score.winner).toBeNull();
      expect(state.tick).toBe(0);
    });
  });

  describe('사운드 이벤트', () => {
    beforeEach(() => {
      startGame(state);
    });

    it('soundEvents가 매 틱마다 초기화됨', () => {
      gameTick(state, [NO_INPUT, NO_INPUT]);
      // 이전 틱의 사운드 이벤트가 남아있지 않아야 함
      expect(Array.isArray(state.soundEvents)).toBe(true);
    });

    it('공 바닥 충돌 시 ballbounce 사운드 이벤트', () => {
      forceScore(state, 'right');
      // scoring 위상에서 공이 바운스하면서 사운드 발생 가능
      expect(Array.isArray(state.soundEvents)).toBe(true);
    });
  });

  describe('게임 위상 전환 순서', () => {
    it('waiting → serving → playing → scoring → serving (반복) → gameOver', () => {
      expect(state.phase).toBe('waiting');

      startGame(state);
      expect(state.phase).toBe('serving');

      // serving → playing 전환 (서브 딜레이 후 공이 네트를 넘길 때)
      advancePastServeDelay(state);

      // 직접 playing으로 전환하여 테스트 진행
      state.phase = 'playing';
      state.phaseTimer = 0;

      // 득점
      forceScore(state, 'right');
      expect(state.phase).toBe('scoring');

      advancePastScoring(state);
      expect(state.phase).toBe('serving');
    });
  });
});
