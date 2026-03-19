// 게임 방 — 1개의 방 = 1개의 독립된 게임 인스턴스
// Authoritative Server: 서버가 60Hz로 물리 시뮬레이션, 30Hz로 상태 브로드캐스트
import type WebSocket from 'ws';
import type { KeyState, ServerStatePacket, RoomStateMessage, SoundEvent } from '../game/types';
import { createInitialState, startGame, gameTick, restartMatch } from '../game/engine';
import { createInputBuffer, bufferInput, consumeInput, buildStatePacket } from '../game/sync';
import type { InputBuffer } from '../game/sync';
import type { GameState } from '../game/types';
import { TIMING } from '../game/constants';

export interface PlayerSlot {
  ws: WebSocket;
  id: string;
  index: 0 | 1;
  lastInputSeq: number;
  disconnectedAt: number | null;
}

export class Room {
  readonly id: string;
  private players: (PlayerSlot | null)[] = [null, null];
  private state: GameState;
  private inputBuffers: [InputBuffer, InputBuffer];
  private lastKeys: [KeyState, KeyState];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastCounter = 0;
  private rematchVotes: Set<string> = new Set();

  // 방 생성 후 일정 시간 내에 2명이 모이지 않으면 폐기
  private readonly ROOM_TIMEOUT_MS = 60_000;
  private roomTimer: ReturnType<typeof setTimeout> | null = null;

  onEmpty?: () => void;

  constructor(id: string) {
    this.id = id;
    this.state = createInitialState();
    this.inputBuffers = [createInputBuffer(), createInputBuffer()];
    this.lastKeys = [
      { left: false, right: false, up: false, powerHit: false },
      { left: false, right: false, up: false, powerHit: false },
    ];

    this.roomTimer = setTimeout(() => {
      if (this.playerCount() < 2) {
        this.destroy();
      }
    }, this.ROOM_TIMEOUT_MS);
  }

  /**
   * 플레이어 추가. 슬롯(0 or 1) 반환, 실패 시 -1
   */
  addPlayer(ws: WebSocket, playerId: string): number {
    // 재접속 확인
    for (let i = 0; i < 2; i++) {
      const slot = this.players[i];
      if (slot && slot.id === playerId && slot.disconnectedAt !== null) {
        slot.ws = ws;
        slot.disconnectedAt = null;
        this.sendTo(i as 0 | 1, { type: 'playerIndex', playerIndex: i as 0 | 1 });
        this.broadcastRoomState();
        return i;
      }
    }

    // 빈 슬롯 찾기
    const slotIndex = this.players[0] === null ? 0 : this.players[1] === null ? 1 : -1;
    if (slotIndex === -1) return -1;

    this.players[slotIndex] = {
      ws,
      id: playerId,
      index: slotIndex as 0 | 1,
      lastInputSeq: -1,
      disconnectedAt: null,
    };

    this.sendTo(slotIndex as 0 | 1, { type: 'playerIndex', playerIndex: slotIndex as 0 | 1 });
    this.broadcastRoomState();

    // 2명 모이면 게임 시작
    if (this.playerCount() === 2) {
      if (this.roomTimer) {
        clearTimeout(this.roomTimer);
        this.roomTimer = null;
      }
      this.startGameLoop();
    }

    return slotIndex;
  }

  /**
   * 플레이어 입력 수신
   */
  handleInput(playerId: string, input: { seq: number; keys: KeyState; timestamp: number }): void {
    const slot = this.findPlayer(playerId);
    if (!slot) return;

    bufferInput(this.inputBuffers[slot.index], {
      type: 'input',
      seq: input.seq,
      keys: input.keys,
      timestamp: input.timestamp,
    });
  }

  /**
   * 재대전 투표
   */
  handleRematch(playerId: string): void {
    this.rematchVotes.add(playerId);
    if (this.rematchVotes.size >= 2) {
      this.rematchVotes.clear();
      restartMatch(this.state);
      this.inputBuffers = [createInputBuffer(), createInputBuffer()];
      this.broadcastRoomState();
      if (!this.tickInterval) {
        this.startGameLoop();
      }
    }
  }

  /**
   * 플레이어 연결 해제
   */
  removePlayer(playerId: string): void {
    const slot = this.findPlayer(playerId);
    if (!slot) return;

    slot.disconnectedAt = Date.now();

    // 재접속 타임아웃
    setTimeout(() => {
      if (slot.disconnectedAt !== null) {
        const idx = this.players.indexOf(slot);
        if (idx !== -1) this.players[idx] = null;
        this.broadcastRoomState();
        if (this.playerCount() === 0) {
          this.destroy();
        }
      }
    }, TIMING.RECONNECT_TIMEOUT_MS);
  }

  /**
   * 특정 WebSocket이 이 방에 속하는지 확인
   */
  hasPlayer(playerId: string): boolean {
    return this.players.some((p) => p?.id === playerId);
  }

  playerCount(): number {
    return this.players.filter((p) => p !== null && p.disconnectedAt === null).length;
  }

  isActive(): boolean {
    return this.tickInterval !== null;
  }

  // --- Private ---

  private startGameLoop(): void {
    if (this.tickInterval) return;

    startGame(this.state);
    this.broadcastRoomState();

    // 60Hz 서버 틱
    this.tickInterval = setInterval(() => {
      this.tick();
    }, TIMING.FRAME_DURATION_MS);
  }

  private stopGameLoop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick(): void {
    // 입력 버퍼에서 키 상태 소비 (없으면 마지막 키 유지)
    for (let i = 0; i < 2; i++) {
      const keys = consumeInput(this.inputBuffers[i]);
      if (keys) {
        this.lastKeys[i] = keys;
      }
    }

    // 게임 물리 틱
    gameTick(this.state, this.lastKeys);

    // 30Hz로 상태 브로드캐스트 (매 2틱마다)
    this.broadcastCounter++;
    if (this.broadcastCounter >= 2) {
      this.broadcastCounter = 0;
      this.broadcastState();
    }

    // 사운드 이벤트 브로드캐스트 (발생 시 즉시)
    if (this.state.soundEvents.length > 0) {
      this.broadcast({
        type: 'sound',
        events: this.state.soundEvents,
      });
    }

    // 게임 오버 시 루프 정지
    if (this.state.phase === 'gameOver') {
      this.stopGameLoop();
    }
  }

  private broadcastState(): void {
    const packet = buildStatePacket(this.state, this.inputBuffers);
    this.broadcast(packet);
  }

  private broadcastRoomState(): void {
    const activePlayers = this.players
      .filter((p): p is PlayerSlot => p !== null && p.disconnectedAt === null)
      .map((p) => p.id);

    let status: 'waiting' | 'ready' | 'playing';
    if (this.state.phase === 'waiting') {
      status = activePlayers.length >= 2 ? 'ready' : 'waiting';
    } else {
      status = 'playing';
    }

    const msg: RoomStateMessage = {
      type: 'roomState',
      roomId: this.id,
      players: activePlayers,
      status,
    };
    this.broadcast(msg);
  }

  private broadcast(msg: unknown): void {
    const data = JSON.stringify(msg);
    for (const slot of this.players) {
      if (slot && slot.disconnectedAt === null && slot.ws.readyState === 1) {
        slot.ws.send(data);
      }
    }
  }

  private sendTo(index: 0 | 1, msg: unknown): void {
    const slot = this.players[index];
    if (slot && slot.disconnectedAt === null && slot.ws.readyState === 1) {
      slot.ws.send(JSON.stringify(msg));
    }
  }

  private findPlayer(playerId: string): PlayerSlot | null {
    return this.players.find((p) => p?.id === playerId) ?? null;
  }

  destroy(): void {
    this.stopGameLoop();
    if (this.roomTimer) {
      clearTimeout(this.roomTimer);
      this.roomTimer = null;
    }
    // 모든 플레이어에게 방 폐기 알림
    this.broadcast({ type: 'roomClosed' });
    this.onEmpty?.();
  }
}
