// WebSocket 네트워크 클라이언트 — 서버 연결, 방 관리, 상태 동기화
import type {
  ClientInput,
  ServerStatePacket,
  CreateRoomMessage,
  JoinRoomMessage,
  RoomStateMessage,
  KeyState,
} from '../types';
import {
  createPredictionState,
  recordPrediction,
  reconcile,
  createInterpolationState,
  pushServerState,
  createConnectionHealth,
  updateConnectionHealth,
} from '../sync';
import type { PredictionState, InterpolationState, ConnectionHealth } from '../sync';
import { TIMING } from '../constants';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface NetworkEvents {
  onRoomState: (msg: RoomStateMessage) => void;
  onGameState: (packet: ServerStatePacket) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
  onError: (error: string) => void;
}

export class NetworkClient {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private events: NetworkEvents;

  readonly prediction: PredictionState;
  readonly interpolation: InterpolationState;
  readonly health: ConnectionHealth;

  private playerIndex: 0 | 1 = 0;
  private roomId: string | null = null;
  private status: ConnectionStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(serverUrl: string, events: NetworkEvents) {
    this.serverUrl = serverUrl;
    this.events = events;
    this.prediction = createPredictionState();
    this.interpolation = createInterpolationState();
    this.health = createConnectionHealth();
  }

  connect(): void {
    if (this.ws) return;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.health.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch {
          // 파싱 실패 무시
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (this.status !== 'disconnected') {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = () => {
        this.events.onError('연결 오류');
      };
    } catch {
      this.setStatus('disconnected');
      this.events.onError('서버 연결 실패');
    }
  }

  disconnect(): void {
    this.setStatus('disconnected');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  createRoom(): void {
    this.send({ type: 'createRoom' } satisfies CreateRoomMessage);
  }

  joinRoom(roomId: string): void {
    this.roomId = roomId;
    this.send({ type: 'joinRoom', roomId } satisfies JoinRoomMessage);
  }

  sendInput(keys: KeyState): void {
    const input = recordPrediction(
      this.prediction,
      keys,
      performance.now(),
    );
    this.send(input);
  }

  setPlayerIndex(index: 0 | 1): void {
    this.playerIndex = index;
  }

  getPlayerIndex(): 0 | 1 {
    return this.playerIndex;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'roomState':
        this.roomId = (msg as unknown as RoomStateMessage).roomId;
        this.events.onRoomState(msg as unknown as RoomStateMessage);
        break;

      case 'state': {
        const packet = msg as unknown as ServerStatePacket;
        pushServerState(this.interpolation, packet);
        reconcile(this.prediction, packet, this.playerIndex);
        updateConnectionHealth(this.health, performance.now());
        this.events.onGameState(packet);
        break;
      }

      case 'playerIndex':
        this.playerIndex = (msg as { playerIndex: 0 | 1 }).playerIndex;
        break;

      case 'error':
        this.events.onError((msg as { message: string }).message);
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.health.reconnectAttempts >= TIMING.RECONNECT_MAX_RETRIES) {
      this.setStatus('disconnected');
      this.events.onError('재연결 실패');
      return;
    }

    this.setStatus('reconnecting');
    this.health.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
      if (this.roomId) {
        // 재연결 후 방 재참가
        setTimeout(() => this.joinRoom(this.roomId!), 500);
      }
    }, 1000 * this.health.reconnectAttempts);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.events.onConnectionChange(status);
  }
}
