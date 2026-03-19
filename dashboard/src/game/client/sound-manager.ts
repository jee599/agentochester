// 사운드 매니저 — 게임 효과음 및 BGM 관리

type SoundName = 'ballbounce' | 'pi' | 'pika' | 'pikachu' | 'pipikachu' | 'chu' | 'powerhit' | 'bgm';

interface SoundEntry {
  audio: HTMLAudioElement;
  volume: number;
}

export class SoundManager {
  private sounds = new Map<SoundName, SoundEntry>();
  private muted = false;
  private masterVolume = 0.5;

  async load(): Promise<void> {
    const sfxList: { name: SoundName; src: string; volume: number }[] = [
      { name: 'ballbounce', src: '/assets/sounds/ballbounce.wav', volume: 0.4 },
      { name: 'pi', src: '/assets/sounds/pi.wav', volume: 0.5 },
      { name: 'pika', src: '/assets/sounds/pika.wav', volume: 0.5 },
      { name: 'pikachu', src: '/assets/sounds/pikachu.wav', volume: 0.5 },
      { name: 'pipikachu', src: '/assets/sounds/pipikachu.wav', volume: 0.5 },
      { name: 'chu', src: '/assets/sounds/chu.wav', volume: 0.5 },
      { name: 'powerhit', src: '/assets/sounds/powerhit.wav', volume: 0.6 },
      { name: 'bgm', src: '/assets/sounds/bgm.mp3', volume: 0.3 },
    ];

    await Promise.all(
      sfxList.map(({ name, src, volume }) => this.loadSound(name, src, volume)),
    );
  }

  private loadSound(name: SoundName, src: string, volume: number): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = volume * this.masterVolume;

      if (name === 'bgm') {
        audio.loop = true;
      }

      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', () => resolve(), { once: true });

      this.sounds.set(name, { audio, volume });
    });
  }

  play(name: SoundName): void {
    if (this.muted) return;
    const entry = this.sounds.get(name);
    if (!entry) return;

    if (name === 'bgm') {
      entry.audio.play().catch(() => {});
      return;
    }

    // SFX는 처음부터 재생
    entry.audio.currentTime = 0;
    entry.audio.play().catch(() => {});
  }

  stop(name: SoundName): void {
    const entry = this.sounds.get(name);
    if (!entry) return;
    entry.audio.pause();
    entry.audio.currentTime = 0;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.sounds.forEach((entry) => {
        entry.audio.pause();
      });
    }
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    this.sounds.forEach((entry) => {
      entry.audio.volume = entry.volume * this.masterVolume;
    });
  }

  dispose(): void {
    this.sounds.forEach((entry) => {
      entry.audio.pause();
      entry.audio.src = '';
    });
    this.sounds.clear();
  }
}
