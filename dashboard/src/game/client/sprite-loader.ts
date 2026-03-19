// 스프라이트시트 로더 — TexturePacker JSON 포맷 파싱
// sprite_sheet.png + sprite_sheet.json에서 프레임 추출

interface SpriteFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SpriteSheetData {
  frames: Record<string, {
    frame: SpriteFrame;
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: SpriteFrame;
    sourceSize: { w: number; h: number };
  }>;
}

export class SpriteLoader {
  private image: HTMLImageElement | null = null;
  private data: SpriteSheetData | null = null;
  private loaded = false;

  async load(): Promise<void> {
    const [img, jsonResponse] = await Promise.all([
      this.loadImage('/assets/images/sprite_sheet.png'),
      fetch('/assets/images/sprite_sheet.json'),
    ]);

    this.image = img;
    this.data = await jsonResponse.json();
    this.loaded = true;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getFrame(key: string): SpriteFrame | null {
    if (!this.data) return null;
    const entry = this.data.frames[key];
    return entry ? entry.frame : null;
  }

  /**
   * 스프라이트시트에서 특정 프레임을 Canvas에 그림
   * @param ctx Canvas 2D context
   * @param key 스프라이트 키 (예: "pikachu/pikachu_0_0.png")
   * @param dx 대상 x
   * @param dy 대상 y
   * @param flipX 좌우 반전 여부 (P2용)
   */
  draw(
    ctx: CanvasRenderingContext2D,
    key: string,
    dx: number,
    dy: number,
    flipX = false,
  ): void {
    if (!this.image || !this.data) return;
    const entry = this.data.frames[key];
    if (!entry) return;

    const { frame } = entry;

    if (flipX) {
      ctx.save();
      ctx.translate(dx + frame.w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(
        this.image,
        frame.x, frame.y, frame.w, frame.h,
        0, 0, frame.w, frame.h,
      );
      ctx.restore();
    } else {
      ctx.drawImage(
        this.image,
        frame.x, frame.y, frame.w, frame.h,
        dx, dy, frame.w, frame.h,
      );
    }
  }

  /**
   * 스프라이트시트에서 타일 반복 그리기
   */
  drawTiled(
    ctx: CanvasRenderingContext2D,
    key: string,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void {
    if (!this.image || !this.data) return;
    const entry = this.data.frames[key];
    if (!entry) return;

    const { frame } = entry;

    for (let x = dx; x < dx + width; x += frame.w) {
      for (let y = dy; y < dy + height; y += frame.h) {
        const drawW = Math.min(frame.w, dx + width - x);
        const drawH = Math.min(frame.h, dy + height - y);
        ctx.drawImage(
          this.image,
          frame.x, frame.y, drawW, drawH,
          x, y, drawW, drawH,
        );
      }
    }
  }

  getImage(): HTMLImageElement | null {
    return this.image;
  }
}
