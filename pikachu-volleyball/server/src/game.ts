import {
  type Ball,
  type Pikachu,
  type InputState,
  type GameStateSync,
  type PlayerSide,
  CANVAS_WIDTH,
  GROUND_Y,
  NET_X,
  NET_WIDTH,
  NET_TOP,
  BALL_RADIUS,
  BALL_GRAVITY,
  BALL_BOUNCE,
  PIKACHU_WIDTH,
  PIKACHU_HEAD_RADIUS,
  PIKACHU_SPEED,
  PIKACHU_JUMP_POWER,
  PIKACHU_GRAVITY,
  WINNING_SCORE,
} from './types.js';

export class Game {
  state: GameStateSync;
  inputs: { left: InputState; right: InputState };

  constructor() {
    this.inputs = {
      left: { left: false, right: false, jump: false },
      right: { left: false, right: false, jump: false },
    };
    this.state = this.createInitialState('left');
  }

  private createBall(servingSide: PlayerSide): Ball {
    return {
      x: servingSide === 'left' ? 200 : 600,
      y: 100,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
    };
  }

  private createPikachu(side: PlayerSide): Pikachu {
    return {
      x: side === 'left' ? 200 : 600,
      y: GROUND_Y,
      vx: 0,
      vy: 0,
      isJumping: false,
      side,
    };
  }

  private createInitialState(servingSide: PlayerSide): GameStateSync {
    return {
      ball: this.createBall(servingSide),
      player1: this.createPikachu('left'),
      player2: this.createPikachu('right'),
      score: this.state?.score ?? { left: 0, right: 0 },
      phase: 'playing',
      servingSide,
    };
  }

  resetRound(servingSide: PlayerSide): void {
    const score = this.state.score;
    this.state = this.createInitialState(servingSide);
    this.state.score = score;
    this.inputs = {
      left: { left: false, right: false, jump: false },
      right: { left: false, right: false, jump: false },
    };
  }

  tick(): { scorer: PlayerSide } | null {
    this.updatePikachu('left');
    this.updatePikachu('right');
    this.updateBall();

    // 바닥 충돌 → 득점
    if (this.state.ball.y + this.state.ball.radius >= GROUND_Y) {
      const scorer: PlayerSide = this.state.ball.x < NET_X ? 'right' : 'left';
      this.state.score[scorer]++;
      return { scorer };
    }

    return null;
  }

  isGameOver(): { winner: PlayerSide } | null {
    if (this.state.score.left >= WINNING_SCORE) return { winner: 'left' };
    if (this.state.score.right >= WINNING_SCORE) return { winner: 'right' };
    return null;
  }

  private updatePikachu(side: PlayerSide): void {
    const p = side === 'left' ? this.state.player1 : this.state.player2;
    const input = this.inputs[side];

    // 이동
    p.vx = 0;
    if (input.left) p.vx = -PIKACHU_SPEED;
    if (input.right) p.vx = PIKACHU_SPEED;

    // 점프
    if (input.jump && !p.isJumping) {
      p.vy = PIKACHU_JUMP_POWER;
      p.isJumping = true;
    }

    // 중력
    p.vy += PIKACHU_GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    // 바닥
    if (p.y >= GROUND_Y) {
      p.y = GROUND_Y;
      p.vy = 0;
      p.isJumping = false;
    }

    // 코트 제한
    const halfWidth = PIKACHU_WIDTH / 2;
    const netHalf = NET_WIDTH / 2;
    if (side === 'left') {
      p.x = Math.max(halfWidth, Math.min(NET_X - netHalf - halfWidth, p.x));
    } else {
      p.x = Math.max(NET_X + netHalf + halfWidth, Math.min(CANVAS_WIDTH - halfWidth, p.x));
    }
  }

  private updateBall(): void {
    const ball = this.state.ball;

    ball.vy += BALL_GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 벽 반사
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx) * BALL_BOUNCE;
    }
    if (ball.x + ball.radius > CANVAS_WIDTH) {
      ball.x = CANVAS_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx) * BALL_BOUNCE;
    }

    // 천장
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy) * BALL_BOUNCE;
    }

    // 네트 충돌
    const netLeft = NET_X - NET_WIDTH / 2;
    const netRight = NET_X + NET_WIDTH / 2;

    if (
      ball.x + ball.radius > netLeft &&
      ball.x - ball.radius < netRight &&
      ball.y + ball.radius > NET_TOP
    ) {
      if (ball.y - ball.radius < NET_TOP && ball.vy > 0) {
        // 위에서 내려오는 경우
        ball.y = NET_TOP - ball.radius;
        ball.vy = -Math.abs(ball.vy) * BALL_BOUNCE;
      } else {
        // 옆에서 오는 경우
        if (ball.x < NET_X) {
          ball.x = netLeft - ball.radius;
          ball.vx = -Math.abs(ball.vx) * BALL_BOUNCE;
        } else {
          ball.x = netRight + ball.radius;
          ball.vx = Math.abs(ball.vx) * BALL_BOUNCE;
        }
      }
    }

    // 피카츄 충돌
    this.handlePikachuCollision(ball, this.state.player1);
    this.handlePikachuCollision(ball, this.state.player2);
  }

  private handlePikachuCollision(ball: Ball, pikachu: Pikachu): void {
    const headX = pikachu.x;
    const headY = pikachu.y - 30;

    const dx = ball.x - headX;
    const dy = ball.y - headY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = ball.radius + PIKACHU_HEAD_RADIUS;

    if (dist >= minDist || dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;

    // 겹침 해소
    ball.x = headX + nx * minDist;
    ball.y = headY + ny * minDist;

    // 반사
    const relVx = ball.vx - pikachu.vx;
    const relVy = ball.vy - pikachu.vy;
    const dot = relVx * nx + relVy * ny;

    if (dot < 0) {
      const bounce = 1.2;
      ball.vx = ball.vx - (1 + bounce) * dot * nx + pikachu.vx * 0.5;
      ball.vy = ball.vy - (1 + bounce) * dot * ny + pikachu.vy * 0.5;

      // 속도 제한
      const maxSpeed = 15;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (speed > maxSpeed) {
        ball.vx = (ball.vx / speed) * maxSpeed;
        ball.vy = (ball.vy / speed) * maxSpeed;
      }
    }
  }
}
