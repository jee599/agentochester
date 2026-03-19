// 점수 시스템
import { SCORING } from './constants';
import type { Ball, ScoreState, GameState } from './types';
import { COURT } from './constants';

/**
 * 공이 바닥에 닿았을 때 득점 처리
 * - 공이 P1 코트(왼쪽)에 떨어지면 → P2 득점
 * - 공이 P2 코트(오른쪽)에 떨어지면 → P1 득점
 * 득점한 플레이어에게 서브권 이동
 */
export function processScoring(
  ball: Ball,
  score: ScoreState,
): { scored: boolean; scoringPlayer: 0 | 1 | null } {
  // 공이 바닥에 닿았는지
  if (ball.y + ball.radius < COURT.GROUND_Y) {
    return { scored: false, scoringPlayer: null };
  }

  // 어느 쪽 코트에 떨어졌는지
  const courtSide: 0 | 1 = ball.x < COURT.NET_X ? 0 : 1;
  // 떨어진 코트 반대편 플레이어가 득점
  const scoringPlayer: 0 | 1 = courtSide === 0 ? 1 : 0;

  score.scores[scoringPlayer] += 1;
  score.servingPlayer = scoringPlayer;

  return { scored: true, scoringPlayer };
}

/**
 * 승리 조건 확인
 * 먼저 MAX_SCORE(15)에 도달하면 승리
 */
export function checkWinCondition(score: ScoreState): 0 | 1 | null {
  if (score.scores[0] >= SCORING.MAX_SCORE) {
    score.winner = 0;
    return 0;
  }
  if (score.scores[1] >= SCORING.MAX_SCORE) {
    score.winner = 1;
    return 1;
  }
  return null;
}

/**
 * 점수 초기화 (새 매치)
 */
export function resetScore(): ScoreState {
  return {
    scores: [0, 0],
    servingPlayer: 0,
    winner: null,
  };
}
