// Canvas 렌더러 — 배경, 네트, 피카츄, 공, 그림자, HUD 렌더링
import { COURT, PHYSICS } from '../constants';
import { getPlayerSpriteKey, getBallSpriteKey } from '../animation';
import type { GameState, Player, Ball, GamePhase } from '../types';
import { SpriteLoader } from './sprite-loader';

// 캔버스 스케일 (원작 432×304를 2x로 표시)
const SCALE = 2;
export const CANVAS_WIDTH = COURT.WIDTH * SCALE;
export const CANVAS_HEIGHT = COURT.HEIGHT * SCALE;

// 배경 레이어 상수 (animations.json 기반)
const MOUNTAIN_Y = 160;
const MOUNTAIN_H = 64;
const WAVE_Y = COURT.GROUND_Y - 32;
const GROUND_LINE_Y = COURT.GROUND_Y;
const NET_PILLAR_X = 213;
const NET_PILLAR_TOP_Y = 160;
const NET_PILLAR_HEIGHT = 56; // 8px × 7세그먼트

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private sprites: SpriteLoader;
  private cloudX = 50;

  constructor(ctx: CanvasRenderingContext2D, sprites: SpriteLoader) {
    this.ctx = ctx;
    this.sprites = sprites;

    // 픽셀 아트용 — 안티앨리어싱 끄기
    ctx.imageSmoothingEnabled = false;
  }

  /**
   * 전체 프레임 렌더링
   */
  render(state: GameState): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(SCALE, SCALE);

    // 1. 배경
    this.drawBackground();

    // 2. 그림자
    this.drawShadows(state);

    // 3. 네트
    this.drawNet();

    // 4. 공
    this.drawBall(state.ball);

    // 5. 플레이어
    this.drawPlayer(state.players[0], false);
    this.drawPlayer(state.players[1], true);

    // 6. HUD (점수판)
    this.drawScoreHUD(state);

    // 7. 페이즈 오버레이
    this.drawPhaseOverlay(state);

    ctx.restore();
  }

  private drawBackground(): void {
    // 하늘 타일
    this.sprites.drawTiled(this.ctx, 'objects/sky_blue.png', 0, 0, COURT.WIDTH, COURT.GROUND_Y);

    // 산
    this.sprites.draw(this.ctx, 'objects/mountain.png', 0, MOUNTAIN_Y);

    // 구름 (느리게 이동)
    this.cloudX = (this.cloudX + 0.1) % (COURT.WIDTH + 48);
    this.sprites.draw(this.ctx, 'objects/cloud.png', this.cloudX - 48, 40);

    // 파도 (바다)
    this.sprites.drawTiled(this.ctx, 'objects/wave.png', 0, WAVE_Y, COURT.WIDTH, 32);

    // 그라운드 라인
    this.sprites.draw(this.ctx, 'objects/ground_line_leftmost.png', 0, GROUND_LINE_Y);
    for (let x = 16; x < COURT.WIDTH - 16; x += 16) {
      this.sprites.draw(this.ctx, 'objects/ground_line.png', x, GROUND_LINE_Y);
    }
    this.sprites.draw(this.ctx, 'objects/ground_line_rightmost.png', COURT.WIDTH - 16, GROUND_LINE_Y);

    // 그라운드 채우기 (빨간색 + 노란색 줄무늬)
    for (let y = GROUND_LINE_Y + 16; y < COURT.HEIGHT; y += 16) {
      const tile = y % 32 === 0 ? 'objects/ground_red.png' : 'objects/ground_yellow.png';
      for (let x = 0; x < COURT.WIDTH; x += 16) {
        this.sprites.draw(this.ctx, tile, x, y);
      }
    }
  }

  private drawNet(): void {
    // 네트 기둥 상단
    this.sprites.draw(this.ctx, 'objects/net_pillar_top.png', NET_PILLAR_X, NET_PILLAR_TOP_Y);

    // 네트 기둥 몸체
    for (let i = 1; i <= NET_PILLAR_HEIGHT / 8; i++) {
      this.sprites.draw(this.ctx, 'objects/net_pillar.png', NET_PILLAR_X, NET_PILLAR_TOP_Y + i * 8);
    }
  }

  private drawShadows(state: GameState): void {
    // 피카츄 그림자
    for (const player of state.players) {
      this.sprites.draw(
        this.ctx,
        'objects/shadow.png',
        player.x - 16,
        COURT.GROUND_Y,
      );
    }

    // 공 그림자
    this.sprites.draw(
      this.ctx,
      'objects/shadow.png',
      state.ball.x - 16,
      COURT.GROUND_Y,
    );
  }

  private drawPlayer(player: Player, flipX: boolean): void {
    const spriteKey = getPlayerSpriteKey(player);
    const halfW = PHYSICS.PLAYER_WIDTH / 2;
    const halfH = PHYSICS.PLAYER_HEIGHT / 2;

    this.sprites.draw(
      this.ctx,
      spriteKey,
      player.x - halfW,
      player.y - halfH,
      flipX,
    );
  }

  private drawBall(ball: Ball): void {
    const spriteKey = getBallSpriteKey(ball);
    const frame = this.sprites.getFrame(spriteKey);
    if (!frame) return;

    this.sprites.draw(
      this.ctx,
      spriteKey,
      ball.x - frame.w / 2,
      ball.y - frame.h / 2,
    );
  }

  private drawScoreHUD(state: GameState): void {
    const { scores } = state.score;

    // P1 점수 (왼쪽)
    this.drawScore(scores[0], 48, 16);

    // 구분선 위치에 'vs' 느낌의 공간
    // P2 점수 (오른쪽)
    this.drawScore(scores[1], COURT.WIDTH - 48 - 32, 16);
  }

  private drawScore(score: number, x: number, y: number): void {
    if (score >= 10) {
      const tens = Math.floor(score / 10);
      const ones = score % 10;
      this.sprites.draw(this.ctx, `number/number_${tens}.png`, x, y);
      this.sprites.draw(this.ctx, `number/number_${ones}.png`, x + 32, y);
    } else {
      this.sprites.draw(this.ctx, `number/number_${score}.png`, x, y);
    }
  }

  private drawPhaseOverlay(state: GameState): void {
    const ctx = this.ctx;

    switch (state.phase) {
      case 'waiting':
        this.drawCenterMessage('messages/common/ready.png');
        break;

      case 'serving':
        if (state.phaseTimer < 30) {
          this.drawCenterMessage('messages/common/ready.png');
        }
        break;

      case 'scoring':
        // 득점 시 잠깐 깜빡임 효과
        if (state.phaseTimer < 10 && state.phaseTimer % 4 < 2) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(0, 0, COURT.WIDTH, COURT.HEIGHT);
        }
        break;

      case 'gameOver': {
        // 반투명 오버레이
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, COURT.WIDTH, COURT.HEIGHT);

        this.drawCenterMessage('messages/common/game_end.png');

        // 승자 피카츄 표시
        const winner = state.score.winner;
        if (winner !== null) {
          this.sprites.draw(this.ctx, 'sitting_pikachu.png', COURT.WIDTH / 2 - 52, COURT.HEIGHT / 2 - 20);
        }
        break;
      }
    }
  }

  private drawCenterMessage(spriteKey: string): void {
    const frame = this.sprites.getFrame(spriteKey);
    if (!frame) return;
    this.sprites.draw(
      this.ctx,
      spriteKey,
      (COURT.WIDTH - frame.w) / 2,
      (COURT.HEIGHT - frame.h) / 2 - 30,
    );
  }
}
