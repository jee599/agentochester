import { describe, it, expect } from 'vitest';
import {
  createInitialBall,
  createPikachu,
  createInitialGameState,
  updatePikachu,
  updateBall,
  checkScoring,
  tickGameLocally,
  resetForServe,
  handleScore,
} from '../lib/game/engine';
import {
  CANVAS_WIDTH,
  GROUND_Y,
  NET_X,
  NET_WIDTH,
  NET_TOP,
  BALL_RADIUS,
  BALL_GRAVITY,
  BALL_BOUNCE,
  PIKACHU_SPEED,
  PIKACHU_JUMP_POWER,
  PIKACHU_GRAVITY,
  PIKACHU_WIDTH,
  WINNING_SCORE,
  type Ball,
  type Pikachu,
  type InputState,
  type GameState,
} from '../lib/game/types';

const noInput: InputState = { left: false, right: false, jump: false };

describe('createInitialBall', () => {
  it('왼쪽 서브 시 x=200', () => {
    const ball = createInitialBall('left');
    expect(ball.x).toBe(200);
    expect(ball.y).toBe(100);
    expect(ball.vx).toBe(0);
    expect(ball.vy).toBe(0);
  });

  it('오른쪽 서브 시 x=600', () => {
    const ball = createInitialBall('right');
    expect(ball.x).toBe(600);
  });

  it('공 반지름이 BALL_RADIUS', () => {
    const ball = createInitialBall('left');
    expect(ball.radius).toBe(BALL_RADIUS);
  });
});

describe('createPikachu', () => {
  it('왼쪽 피카츄 초기 위치는 200', () => {
    const p = createPikachu('left');
    expect(p.x).toBe(200);
    expect(p.side).toBe('left');
  });

  it('오른쪽 피카츄 초기 위치는 600', () => {
    const p = createPikachu('right');
    expect(p.x).toBe(600);
    expect(p.side).toBe('right');
  });

  it('초기 상태에서 점프 중이 아니다', () => {
    const p = createPikachu('left');
    expect(p.isJumping).toBe(false);
    expect(p.vy).toBe(0);
  });
});

describe('updatePikachu — 이동', () => {
  it('왼쪽 입력 시 x가 감소한다', () => {
    const p = createPikachu('left');
    const next = updatePikachu(p, { left: true, right: false, jump: false });
    expect(next.x).toBe(p.x - PIKACHU_SPEED);
  });

  it('오른쪽 입력 시 x가 증가한다', () => {
    const p = createPikachu('left');
    const next = updatePikachu(p, { left: false, right: true, jump: false });
    expect(next.x).toBe(p.x + PIKACHU_SPEED);
  });

  it('좌우 동시 입력 시 오른쪽이 우선 (나중에 덮어씀)', () => {
    const p = createPikachu('left');
    const next = updatePikachu(p, { left: true, right: true, jump: false });
    // left 먼저 적용 → vx = -SPEED, right 나중 적용 → vx = +SPEED
    expect(next.x).toBe(p.x + PIKACHU_SPEED);
  });

  it('입력 없으면 제자리', () => {
    const p = createPikachu('left');
    const next = updatePikachu(p, noInput);
    // 중력만 적용되지만 x는 바뀌지 않아야 함
    expect(next.x).toBe(p.x);
  });
});

describe('updatePikachu — 점프', () => {
  it('점프 입력 시 vy가 PIKACHU_JUMP_POWER로 설정된다', () => {
    const p = createPikachu('left');
    const next = updatePikachu(p, { left: false, right: false, jump: true });
    // 점프 직후 vy = PIKACHU_JUMP_POWER + PIKACHU_GRAVITY (한 틱)
    expect(next.isJumping).toBe(true);
    expect(next.vy).toBe(PIKACHU_JUMP_POWER + PIKACHU_GRAVITY);
  });

  it('이중 점프 방지', () => {
    const p: Pikachu = { ...createPikachu('left'), isJumping: true, vy: -5 };
    const next = updatePikachu(p, { left: false, right: false, jump: true });
    // isJumping=true이므로 PIKACHU_JUMP_POWER가 다시 적용되면 안됨
    expect(next.vy).toBe(p.vy + PIKACHU_GRAVITY);
  });

  it('바닥에 착지하면 isJumping=false, vy=0', () => {
    // GROUND_Y 바로 아래에서 떨어지는 피카츄
    const p: Pikachu = {
      ...createPikachu('left'),
      y: GROUND_Y - 1,
      vy: 5,
      isJumping: true,
    };
    const next = updatePikachu(p, noInput);
    expect(next.y).toBe(GROUND_Y);
    expect(next.vy).toBe(0);
    expect(next.isJumping).toBe(false);
  });
});

describe('updatePikachu — 영역 제한', () => {
  it('왼쪽 피카츄는 왼쪽 벽을 넘지 못한다', () => {
    const halfW = PIKACHU_WIDTH / 2;
    const p: Pikachu = { ...createPikachu('left'), x: halfW };
    const next = updatePikachu(p, { left: true, right: false, jump: false });
    expect(next.x).toBeGreaterThanOrEqual(halfW);
  });

  it('왼쪽 피카츄는 네트를 넘지 못한다', () => {
    const halfW = PIKACHU_WIDTH / 2;
    const maxX = NET_X - NET_WIDTH / 2 - halfW;
    const p: Pikachu = { ...createPikachu('left'), x: maxX };
    const next = updatePikachu(p, { left: false, right: true, jump: false });
    expect(next.x).toBeLessThanOrEqual(maxX);
  });

  it('오른쪽 피카츄는 네트 왼쪽으로 못 간다', () => {
    const halfW = PIKACHU_WIDTH / 2;
    const minX = NET_X + NET_WIDTH / 2 + halfW;
    const p: Pikachu = { ...createPikachu('right'), x: minX };
    const next = updatePikachu(p, { left: true, right: false, jump: false });
    expect(next.x).toBeGreaterThanOrEqual(minX);
  });

  it('오른쪽 피카츄는 오른쪽 벽을 넘지 못한다', () => {
    const halfW = PIKACHU_WIDTH / 2;
    const maxX = CANVAS_WIDTH - halfW;
    const p: Pikachu = { ...createPikachu('right'), x: maxX };
    const next = updatePikachu(p, { left: false, right: true, jump: false });
    expect(next.x).toBeLessThanOrEqual(maxX);
  });
});

describe('updateBall — 중력과 이동', () => {
  it('중력이 매 틱마다 적용된다', () => {
    const ball = createInitialBall('left');
    const next = updateBall(ball);
    expect(next.vy).toBeCloseTo(ball.vy + BALL_GRAVITY);
  });

  it('위치가 속도만큼 변한다', () => {
    const ball: Ball = { x: 400, y: 200, vx: 3, vy: 2, radius: BALL_RADIUS };
    const next = updateBall(ball);
    expect(next.x).toBeCloseTo(ball.x + ball.vx);
    expect(next.y).toBeCloseTo(ball.y + ball.vy + BALL_GRAVITY);
  });
});

describe('updateBall — 벽 바운스', () => {
  it('왼쪽 벽 바운스', () => {
    const ball: Ball = { x: 5, y: 200, vx: -10, vy: 0, radius: BALL_RADIUS };
    const next = updateBall(ball);
    expect(next.x).toBeGreaterThanOrEqual(BALL_RADIUS);
    expect(next.vx).toBeGreaterThan(0);
  });

  it('오른쪽 벽 바운스', () => {
    const ball: Ball = { x: CANVAS_WIDTH - 5, y: 200, vx: 10, vy: 0, radius: BALL_RADIUS };
    const next = updateBall(ball);
    expect(next.x).toBeLessThanOrEqual(CANVAS_WIDTH - BALL_RADIUS);
    expect(next.vx).toBeLessThan(0);
  });

  it('천장 바운스', () => {
    const ball: Ball = { x: 200, y: 5, vx: 0, vy: -10, radius: BALL_RADIUS };
    const next = updateBall(ball);
    expect(next.y).toBeGreaterThanOrEqual(BALL_RADIUS);
    expect(next.vy).toBeGreaterThan(0);
  });

  it('벽 바운스 시 탄성 계수가 적용된다', () => {
    const ball: Ball = { x: 5, y: 200, vx: -10, vy: 0, radius: BALL_RADIUS };
    const next = updateBall(ball);
    expect(next.vx).toBeCloseTo(10 * BALL_BOUNCE, 1);
  });
});

describe('updateBall — 네트 충돌', () => {
  it('위에서 네트에 떨어지면 위로 반사', () => {
    // ball.y + ball.radius <= NET_TOP 조건: 이전 프레임에서 공 바닥이 NET_TOP 이상
    // 이동 후 next.y + radius > NET_TOP 이 되어야 충돌 발생
    const ball: Ball = {
      x: NET_X,
      y: NET_TOP - BALL_RADIUS, // 이전 프레임: 공 바닥 = NET_TOP (경계)
      vx: 0,
      vy: 5, // 아래로 떨어짐
      radius: BALL_RADIUS,
    };
    const next = updateBall(ball);
    // 네트 위에서 반사: vy가 음수가 되어야 함
    expect(next.vy).toBeLessThan(0);
    expect(next.y).toBeLessThanOrEqual(NET_TOP);
  });

  it('왼쪽에서 네트 옆면 충돌', () => {
    const netLeft = NET_X - NET_WIDTH / 2;
    const ball: Ball = {
      x: netLeft - BALL_RADIUS + 2,
      y: NET_TOP + 30,
      vx: 5,
      vy: 0,
      radius: BALL_RADIUS,
    };
    const next = updateBall(ball);
    expect(next.x).toBeLessThanOrEqual(netLeft);
    expect(next.vx).toBeLessThan(0);
  });

  it('오른쪽에서 네트 옆면 충돌', () => {
    const netRight = NET_X + NET_WIDTH / 2;
    const ball: Ball = {
      x: netRight + BALL_RADIUS - 2,
      y: NET_TOP + 30,
      vx: -5,
      vy: 0,
      radius: BALL_RADIUS,
    };
    const next = updateBall(ball);
    expect(next.x).toBeGreaterThanOrEqual(netRight);
    expect(next.vx).toBeGreaterThan(0);
  });
});

describe('checkScoring', () => {
  it('공이 왼쪽 바닥에 닿으면 right 득점', () => {
    const ball: Ball = { x: 200, y: GROUND_Y - BALL_RADIUS, vx: 0, vy: 5, radius: BALL_RADIUS };
    const scorer = checkScoring(ball);
    expect(scorer).toBe('right');
  });

  it('공이 오른쪽 바닥에 닿으면 left 득점', () => {
    const ball: Ball = { x: 600, y: GROUND_Y - BALL_RADIUS, vx: 0, vy: 5, radius: BALL_RADIUS };
    const scorer = checkScoring(ball);
    expect(scorer).toBe('left');
  });

  it('공이 바닥에 닿지 않으면 null', () => {
    const ball: Ball = { x: 400, y: 200, vx: 0, vy: 0, radius: BALL_RADIUS };
    expect(checkScoring(ball)).toBeNull();
  });

  it('네트 경계(x=NET_X)에서 바닥에 닿으면 left 득점 (오른쪽 코트)', () => {
    const ball: Ball = { x: NET_X, y: GROUND_Y, vx: 0, vy: 0, radius: BALL_RADIUS };
    // x >= NET_X -> 오른쪽 코트 -> left 득점? 실제 코드 확인: x < NET_X ? 'right' : 'left'
    // x === NET_X -> 'left'
    expect(checkScoring(ball)).toBe('left');
  });
});

describe('handleScore', () => {
  let state: GameState;

  it('득점 시 점수가 증가한다', () => {
    state = createInitialGameState();
    state.phase = 'playing';
    const next = handleScore(state, 'left');
    expect(next.score.left).toBe(1);
    expect(next.servingSide).toBe('left');
  });

  it('WINNING_SCORE 달성 시 gameOver phase', () => {
    state = createInitialGameState();
    state.phase = 'playing';
    state.score = { left: WINNING_SCORE - 1, right: 0 };
    const next = handleScore(state, 'left');
    expect(next.phase).toBe('gameOver');
    expect(next.winner).toBe('left');
  });

  it('WINNING_SCORE 미달 시 scored phase', () => {
    state = createInitialGameState();
    state.phase = 'playing';
    state.score = { left: 5, right: 3 };
    const next = handleScore(state, 'right');
    expect(next.phase).toBe('scored');
    expect(next.score.right).toBe(4);
  });
});

describe('tickGameLocally', () => {
  it('phase가 playing이 아니면 상태 그대로 반환', () => {
    const state = createInitialGameState(); // phase = 'lobby'
    const next = tickGameLocally(state, noInput);
    expect(next).toBe(state);
  });

  it('mySide=left일 때 player1만 로컬 업데이트', () => {
    const state: GameState = {
      ...createInitialGameState(),
      phase: 'playing',
      mySide: 'left',
    };
    const input: InputState = { left: true, right: false, jump: false };
    const next = tickGameLocally(state, input);
    expect(next.player1.x).toBeLessThan(state.player1.x);
    // player2는 변하지 않음 (공 물리로 인한 위치 변화 없음)
    expect(next.player2.x).toBe(state.player2.x);
  });

  it('mySide=right일 때 player2만 로컬 업데이트', () => {
    const state: GameState = {
      ...createInitialGameState(),
      phase: 'playing',
      mySide: 'right',
    };
    const input: InputState = { left: false, right: true, jump: false };
    const next = tickGameLocally(state, input);
    expect(next.player2.x).toBeGreaterThan(state.player2.x);
  });
});

describe('resetForServe', () => {
  it('서브 리셋 후 공, 플레이어 위치 초기화', () => {
    const state: GameState = {
      ...createInitialGameState(),
      phase: 'scored',
      servingSide: 'right',
    };
    state.player1.x = 100;
    state.ball.x = 500;
    const next = resetForServe(state);
    expect(next.ball.x).toBe(600); // right side serve
    expect(next.player1.x).toBe(200);
    expect(next.player2.x).toBe(600);
    expect(next.phase).toBe('playing');
  });

  it('점수는 유지된다', () => {
    const state: GameState = {
      ...createInitialGameState(),
      phase: 'scored',
      servingSide: 'left',
    };
    state.score = { left: 7, right: 3 };
    const next = resetForServe(state);
    expect(next.score).toEqual({ left: 7, right: 3 });
  });
});

describe('Edge cases', () => {
  it('공이 네트 꼭대기 정확히에 있을 때', () => {
    const ball: Ball = {
      x: NET_X,
      y: NET_TOP - BALL_RADIUS,
      vx: 0,
      vy: 1,
      radius: BALL_RADIUS,
    };
    // 네트 위에 정확히 놓인 공이 아래로 떨어질 때
    const next = updateBall(ball);
    // 충돌이 일어나든 안 일어나든 에러 없이 처리되어야 함
    expect(next).toBeDefined();
    expect(typeof next.x).toBe('number');
    expect(typeof next.y).toBe('number');
  });

  it('공이 코너(벽+바닥)에 있을 때 NaN이 발생하지 않는다', () => {
    const ball: Ball = {
      x: BALL_RADIUS,
      y: GROUND_Y - BALL_RADIUS,
      vx: -5,
      vy: 5,
      radius: BALL_RADIUS,
    };
    const next = updateBall(ball);
    expect(Number.isNaN(next.x)).toBe(false);
    expect(Number.isNaN(next.y)).toBe(false);
    expect(Number.isNaN(next.vx)).toBe(false);
    expect(Number.isNaN(next.vy)).toBe(false);
  });

  it('피카츄가 벽 경계값에서 이동해도 범위를 벗어나지 않는다', () => {
    const halfW = PIKACHU_WIDTH / 2;
    const p: Pikachu = { ...createPikachu('left'), x: halfW };
    // 100 틱 동안 왼쪽으로 이동
    let current = p;
    for (let i = 0; i < 100; i++) {
      current = updatePikachu(current, { left: true, right: false, jump: false });
    }
    expect(current.x).toBeGreaterThanOrEqual(halfW);
  });

  it('매우 빠른 공도 벽 안에 머문다', () => {
    const ball: Ball = {
      x: 400,
      y: 200,
      vx: 100,
      vy: -100,
      radius: BALL_RADIUS,
    };
    let current = ball;
    for (let i = 0; i < 50; i++) {
      current = updateBall(current);
    }
    expect(current.x).toBeGreaterThanOrEqual(BALL_RADIUS);
    expect(current.x).toBeLessThanOrEqual(CANVAS_WIDTH - BALL_RADIUS);
  });
});
