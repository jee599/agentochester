// 메인 게임 엔진 — 게임 루프, 상태 관리, 위상 전환
import { COURT, PHYSICS, TIMING } from './constants';
import { updatePlayer, updateBall, bounceWalls, resetBallForServe, resetPlayersForServe, checkBallGroundContact } from './physics';
import { processCollisions, resolveBallFloorCollision, checkBallFloorCollision } from './collision';
import { processScoring, checkWinCondition, resetScore } from './scoring';
import { resolvePlayerAnimState, updatePlayerAnimation, updateBallAnimation } from './animation';
import type { GameState, Player, Ball, KeyState, GamePhase, SoundEvent, CollisionResult } from './types';

/**
 * 초기 게임 상태 생성
 */
export function createInitialState(): GameState {
  return {
    phase: 'waiting',
    players: [createPlayer(0), createPlayer(1)],
    ball: createBall(),
    score: resetScore(),
    tick: 0,
    phaseTimer: 0,
    soundEvents: [],
  };
}

function createPlayer(index: 0 | 1): Player {
  const x = index === 0 ? COURT.WIDTH / 4 : (COURT.WIDTH * 3) / 4;
  return {
    index,
    x,
    y: COURT.GROUND_Y,
    vx: 0,
    vy: 0,
    state: 'idle',
    isGrounded: true,
    animFrame: 0,
    animTimer: 0,
    isDiving: false,
    diveCooldown: 0,
  };
}

function createBall(): Ball {
  return {
    x: COURT.WIDTH / 4,
    y: COURT.GROUND_Y - 80,
    vx: 0,
    vy: 0,
    radius: PHYSICS.BALL_RADIUS,
    state: 'rotate',
    animFrame: 0,
    animTimer: 0,
    isPowerHit: false,
    lastHitBy: null,
  };
}

/**
 * 게임 시작 — waiting → serving 전환
 */
export function startGame(state: GameState): void {
  state.phase = 'serving';
  state.phaseTimer = 0;
  state.score = resetScore();
  resetPlayersForServe(state);
  resetBallForServe(state);
}

/**
 * 메인 게임 틱 (60Hz)
 * Authoritative Server에서 매 틱마다 호출
 *
 * @param state - 현재 게임 상태 (mutate)
 * @param inputs - 양 플레이어의 키 입력
 */
export function gameTick(
  state: GameState,
  inputs: [KeyState, KeyState],
): void {
  state.tick++;
  state.phaseTimer++;
  state.soundEvents = [];

  switch (state.phase) {
    case 'waiting':
      // 대기 중 — 아무것도 하지 않음
      break;

    case 'serving':
      tickServing(state, inputs);
      break;

    case 'playing':
      tickPlaying(state, inputs);
      break;

    case 'scoring':
      tickScoring(state);
      break;

    case 'gameOver':
      // 게임 종료 — 재시작 대기
      break;
  }
}

/**
 * 서브 위상
 * - 서브 딜레이 동안 공이 정지 상태로 대기
 * - 딜레이 후 공이 자유낙하 시작
 * - 플레이어 입력은 받되, 서브 플레이어만 공을 칠 수 있음
 */
function tickServing(state: GameState, inputs: [KeyState, KeyState]): void {
  // 플레이어 물리
  for (let i = 0; i < 2; i++) {
    updatePlayer(state.players[i], inputs[i]);
  }

  if (state.phaseTimer < TIMING.SERVE_DELAY_FRAMES) {
    // 딜레이 중 — 공을 서브 플레이어 위에 고정
    resetBallForServe(state);
    return;
  }

  // 딜레이 후 — 공 물리 시작
  updateBall(state.ball);
  bounceWalls(state.ball);

  // 충돌 처리
  const collisions = processCollisions(state.players, state.ball, inputs);
  emitCollisionSounds(state, collisions);

  // 공이 바닥에 닿으면 → 득점 처리
  const groundSide = checkBallGroundContact(state.ball);
  if (groundSide !== null) {
    handleScoring(state);
    return;
  }

  // 공이 네트를 넘으면 → playing 전환
  const servingSide = state.score.servingPlayer;
  const ballOnOtherSide = servingSide === 0
    ? state.ball.x > COURT.NET_X
    : state.ball.x < COURT.NET_X;

  if (ballOnOtherSide) {
    state.phase = 'playing';
    state.phaseTimer = 0;
  }

  // 애니메이션 업데이트
  updateAnimations(state);
}

/**
 * 플레이 위상 — 랠리 진행
 */
function tickPlaying(state: GameState, inputs: [KeyState, KeyState]): void {
  // 1. 플레이어 물리
  for (let i = 0; i < 2; i++) {
    updatePlayer(state.players[i], inputs[i]);
  }

  // 2. 공 물리
  updateBall(state.ball);
  bounceWalls(state.ball);

  // 3. 충돌 처리
  const collisions = processCollisions(state.players, state.ball, inputs);
  emitCollisionSounds(state, collisions);

  // 4. 득점 판정
  const groundSide = checkBallGroundContact(state.ball);
  if (groundSide !== null) {
    handleScoring(state);
    return;
  }

  // 5. 애니메이션 업데이트
  updateAnimations(state);
}

/**
 * 득점 처리 → scoring 위상 전환
 */
function handleScoring(state: GameState): void {
  // 바닥 바운스 (시각적 연출)
  const floorCol = checkBallFloorCollision(state.ball);
  if (floorCol) {
    resolveBallFloorCollision(state.ball, floorCol);
  }

  // 점수 계산
  processScoring(state.ball, state.score);

  state.phase = 'scoring';
  state.phaseTimer = 0;
}

/**
 * 득점 위상 — 연출 후 다음 서브 또는 게임 종료
 */
function tickScoring(state: GameState): void {
  // 공 바운스 애니메이션 계속
  updateBall(state.ball);
  bounceWalls(state.ball);
  const floorCol = checkBallFloorCollision(state.ball);
  if (floorCol) {
    resolveBallFloorCollision(state.ball, floorCol);
  }

  if (state.phaseTimer < TIMING.SCORE_DISPLAY_FRAMES) return;

  // 승리 판정
  const winner = checkWinCondition(state.score);
  if (winner !== null) {
    state.phase = 'gameOver';
    state.phaseTimer = 0;
    return;
  }

  // 다음 서브
  state.phase = 'serving';
  state.phaseTimer = 0;
  resetPlayersForServe(state);
  resetBallForServe(state);
}

/**
 * 충돌 결과에서 사운드 이벤트 생성
 */
function emitCollisionSounds(state: GameState, collisions: CollisionResult[]): void {
  for (const col of collisions) {
    if (col.type === 'player_ball') {
      // 스파이크/파워히트 여부는 ball.isPowerHit로 판단
      state.soundEvents.push(state.ball.isPowerHit ? 'powerhit' : 'pika');
    } else if (col.type === 'ball_net' || col.type === 'ball_floor') {
      state.soundEvents.push('ballbounce');
    }
  }
}

/**
 * 애니메이션 업데이트 (물리 후 호출)
 */
function updateAnimations(state: GameState): void {
  for (const player of state.players) {
    resolvePlayerAnimState(player);
    updatePlayerAnimation(player);
  }
  updateBallAnimation(state.ball);
}

/**
 * 새 매치 시작 (재대전)
 */
export function restartMatch(state: GameState): void {
  state.score = resetScore();
  state.tick = 0;
  startGame(state);
}

/**
 * 게임 상태 스냅샷 (디버깅/로깅용)
 */
export function getStateSnapshot(state: GameState) {
  return {
    tick: state.tick,
    phase: state.phase,
    score: [...state.score.scores],
    ball: { x: Math.round(state.ball.x), y: Math.round(state.ball.y) },
    p1: { x: Math.round(state.players[0].x), y: Math.round(state.players[0].y), state: state.players[0].state },
    p2: { x: Math.round(state.players[1].x), y: Math.round(state.players[1].y), state: state.players[1].state },
  };
}
