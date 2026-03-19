// 게임 클라이언트 — 60fps 게임 루프, 로컬 물리 시뮬레이션 + 렌더링 통합
import { createInitialState, startGame, gameTick, restartMatch } from '../engine';
import { TIMING } from '../constants';
import type { GameState, ServerStatePacket } from '../types';
import { SpriteLoader } from './sprite-loader';
import { SoundManager } from './sound-manager';
import { InputManager } from './input-manager';
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer';
import { NetworkClient, type ConnectionStatus } from './network-client';
import type { RoomStateMessage } from '../types';

export type GameMode = 'local' | 'online';
export type ClientPhase = 'loading' | 'lobby' | 'waiting' | 'playing' | 'gameOver';

interface GameClientEvents {
  onPhaseChange: (phase: ClientPhase) => void;
  onRoomCreated: (roomId: string) => void;
  onScoreUpdate: (scores: [number, number]) => void;
  onGameOver: (winner: 0 | 1) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
  onError: (error: string) => void;
}

export class GameClient {
  private sprites: SpriteLoader;
  private sounds: SoundManager;
  private input: InputManager;
  private renderer: Renderer | null = null;
  private network: NetworkClient | null = null;

  private state: GameState;
  private mode: GameMode = 'local';
  private phase: ClientPhase = 'loading';
  private events: GameClientEvents;

  private animFrameId: number | null = null;
  private lastFrameTime = 0;
  private accumulator = 0;

  private prevScores: [number, number] = [0, 0];
  private prevPhase: string = 'waiting';

  constructor(events: GameClientEvents) {
    this.sprites = new SpriteLoader();
    this.sounds = new SoundManager();
    this.input = new InputManager();
    this.state = createInitialState();
    this.events = events;
  }

  /**
   * 에셋 로드 + 초기화
   */
  async init(canvas: HTMLCanvasElement): Promise<void> {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context 생성 실패');

    await Promise.all([
      this.sprites.load(),
      this.sounds.load(),
    ]);

    this.renderer = new Renderer(ctx, this.sprites);
    this.input.attach();

    this.setPhase('lobby');
  }

  /**
   * 로컬 2P 모드 시작
   */
  startLocalGame(): void {
    this.mode = 'local';
    this.state = createInitialState();
    startGame(this.state);
    this.setPhase('playing');
    this.startGameLoop();
    this.sounds.play('pipikachu');
    this.sounds.play('bgm');
  }

  /**
   * 온라인 모드 — 방 생성
   */
  createOnlineRoom(serverUrl: string): void {
    this.mode = 'online';
    this.initNetwork(serverUrl);
    this.network!.connect();

    // 연결 성공 후 방 생성
    const checkConnected = setInterval(() => {
      if (this.network?.getStatus() === 'connected') {
        clearInterval(checkConnected);
        this.network!.createRoom();
      }
    }, 100);
  }

  /**
   * 온라인 모드 — 방 참가
   */
  joinOnlineRoom(serverUrl: string, roomId: string): void {
    this.mode = 'online';
    this.initNetwork(serverUrl);
    this.network!.connect();

    const checkConnected = setInterval(() => {
      if (this.network?.getStatus() === 'connected') {
        clearInterval(checkConnected);
        this.network!.joinRoom(roomId);
      }
    }, 100);
  }

  /**
   * 재대전
   */
  rematch(): void {
    if (this.mode === 'local') {
      restartMatch(this.state);
      this.prevScores = [0, 0];
      this.setPhase('playing');
      this.startGameLoop();
      this.sounds.play('pipikachu');
      this.sounds.play('bgm');
    }
  }

  /**
   * 사운드 토글
   */
  toggleMute(): boolean {
    const newMuted = !this.sounds.isMuted();
    this.sounds.setMuted(newMuted);
    return newMuted;
  }

  isMuted(): boolean {
    return this.sounds.isMuted();
  }

  /**
   * 현재 게임 상태 반환 (React에서 읽기용)
   */
  getState(): GameState {
    return this.state;
  }

  getPhase(): ClientPhase {
    return this.phase;
  }

  getMode(): GameMode {
    return this.mode;
  }

  getRoomId(): string | null {
    return this.network?.getRoomId() ?? null;
  }

  /**
   * 정리
   */
  dispose(): void {
    this.stopGameLoop();
    this.input.detach();
    this.sounds.dispose();
    this.network?.disconnect();
  }

  // --- Private ---

  private initNetwork(serverUrl: string): void {
    this.network = new NetworkClient(serverUrl, {
      onRoomState: (msg: RoomStateMessage) => this.handleRoomState(msg),
      onGameState: (packet: ServerStatePacket) => this.handleServerState(packet),
      onConnectionChange: (status: ConnectionStatus) => this.events.onConnectionChange(status),
      onError: (error: string) => this.events.onError(error),
    });
  }

  private handleRoomState(msg: RoomStateMessage): void {
    if (msg.status === 'waiting') {
      this.setPhase('waiting');
      this.events.onRoomCreated(msg.roomId);
    } else if (msg.status === 'playing') {
      this.state = createInitialState();
      startGame(this.state);
      this.setPhase('playing');
      this.startGameLoop();
      this.sounds.play('pipikachu');
      this.sounds.play('bgm');
    }
  }

  private handleServerState(packet: ServerStatePacket): void {
    // 서버 상태로 로컬 상태 보정
    this.state.ball.x = packet.ball.x;
    this.state.ball.y = packet.ball.y;
    this.state.ball.vx = packet.ball.vx;
    this.state.ball.vy = packet.ball.vy;

    for (let i = 0; i < 2; i++) {
      this.state.players[i].x = packet.players[i].x;
      this.state.players[i].y = packet.players[i].y;
      this.state.players[i].vy = packet.players[i].vy;
      this.state.players[i].state = packet.players[i].state;
    }

    this.state.score.scores = [...packet.score];
    this.state.score.servingPlayer = packet.servingPlayer;
    this.state.phase = packet.phase;
  }

  private startGameLoop(): void {
    this.stopGameLoop();
    this.lastFrameTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastFrameTime);
  }

  private stopGameLoop(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (timestamp: number): void => {
    const dt = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.accumulator += dt;

    const frameDuration = TIMING.FRAME_DURATION_MS;

    // 고정 타임스텝 물리 업데이트
    while (this.accumulator >= frameDuration) {
      this.update();
      this.accumulator -= frameDuration;
    }

    // 렌더링
    this.renderer?.render(this.state);

    // 게임 오버 체크
    if (this.state.phase === 'gameOver' && this.phase !== 'gameOver') {
      this.setPhase('gameOver');
      const winner = this.state.score.winner;
      if (winner !== null) {
        this.events.onGameOver(winner);
        this.sounds.play('pikachu');
      }
      this.sounds.stop('bgm');
      return;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    if (this.mode === 'local') {
      // 로컬 모드: 직접 물리 시뮬레이션
      const p1Keys = this.input.getKeyState();
      const p2Keys = this.input.getKeyStateP2();
      gameTick(this.state, [p1Keys, p2Keys]);
    } else {
      // 온라인 모드: 입력을 서버에 전송, 로컬 예측
      const keys = this.input.getKeyState();
      this.network?.sendInput(keys);
    }

    // 사운드 이벤트 감지
    this.checkSoundEvents();
  }

  private checkSoundEvents(): void {
    const scores = this.state.score.scores;
    const phase = this.state.phase;

    // 충돌 사운드 이벤트 소비
    for (const evt of this.state.soundEvents) {
      this.sounds.play(evt);
    }

    // 득점 시 효과음
    if (scores[0] !== this.prevScores[0] || scores[1] !== this.prevScores[1]) {
      this.sounds.play('chu');
      this.events.onScoreUpdate([...scores]);
      this.prevScores = [...scores];
    }

    // 위상 전환 사운드
    if (phase !== this.prevPhase) {
      if (phase === 'serving') {
        this.sounds.play('pi');
      }
      this.prevPhase = phase;
    }
  }

  private setPhase(phase: ClientPhase): void {
    this.phase = phase;
    this.events.onPhaseChange(phase);
  }
}
