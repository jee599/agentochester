// 키보드 입력 관리 — 게임 키 바인딩 및 상태 추적
import type { KeyState } from '../types';

// P1: 방향키 + D (파워히트)
// P2: WASD + F (파워히트) — 로컬 2P 테스트용
const KEY_BINDINGS_P1: Record<string, keyof KeyState> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  KeyD: 'powerHit',
};

const KEY_BINDINGS_P2: Record<string, keyof KeyState> = {
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyF: 'powerHit',
};

export class InputManager {
  private keyState: KeyState = { left: false, right: false, up: false, powerHit: false };
  private keyStateP2: KeyState = { left: false, right: false, up: false, powerHit: false };
  private localPlayerIndex: 0 | 1 = 0;
  private enabled = true;

  constructor() {
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.reset();
  }

  setLocalPlayer(index: 0 | 1): void {
    this.localPlayerIndex = index;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  getKeyState(): KeyState {
    return { ...this.keyState };
  }

  getKeyStateP2(): KeyState {
    return { ...this.keyStateP2 };
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;
    if (e.repeat) return;

    // P1 키 바인딩
    const p1Key = KEY_BINDINGS_P1[e.code];
    if (p1Key) {
      e.preventDefault();
      this.keyState[p1Key] = true;
      return;
    }

    // P2 키 바인딩 (로컬 2P)
    const p2Key = KEY_BINDINGS_P2[e.code];
    if (p2Key) {
      e.preventDefault();
      this.keyStateP2[p2Key] = true;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.enabled) return;

    const p1Key = KEY_BINDINGS_P1[e.code];
    if (p1Key) {
      e.preventDefault();
      this.keyState[p1Key] = false;
      return;
    }

    const p2Key = KEY_BINDINGS_P2[e.code];
    if (p2Key) {
      e.preventDefault();
      this.keyStateP2[p2Key] = false;
    }
  }

  private reset(): void {
    this.keyState = { left: false, right: false, up: false, powerHit: false };
    this.keyStateP2 = { left: false, right: false, up: false, powerHit: false };
  }
}
