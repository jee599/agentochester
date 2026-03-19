// 멀티플레이어 게임 서버 — WebSocket 기반 실시간 통신
// 방 생성/참가, 메시지 라우팅, 연결 관리
import { WebSocketServer, type WebSocket } from 'ws';
import { Room } from './room';
import { randomBytes } from 'crypto';

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  roomId: string | null;
}

export class GameServer {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, Room>();
  private clients = new Map<WebSocket, ClientConnection>();

  private readonly port: number;
  private readonly MAX_ROOMS = 100;

  constructor(port = 8080) {
    this.port = port;
  }

  start(): void {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      const playerId = this.generateId(16);
      const conn: ClientConnection = { ws, playerId, roomId: null };
      this.clients.set(ws, conn);

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(conn, msg);
        } catch {
          // 파싱 실패 무시
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(conn);
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        // WebSocket 에러는 close 이벤트로 처리됨
      });
    });

    console.log(`[GameServer] ws://localhost:${this.port} 에서 대기 중`);
  }

  stop(): void {
    for (const room of this.rooms.values()) {
      room.destroy();
    }
    this.rooms.clear();
    this.wss?.close();
    this.wss = null;
    console.log('[GameServer] 서버 종료');
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getClientCount(): number {
    return this.clients.size;
  }

  // --- Message Routing ---

  private handleMessage(conn: ClientConnection, msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'createRoom':
        this.handleCreateRoom(conn);
        break;

      case 'joinRoom':
        this.handleJoinRoom(conn, msg.roomId as string);
        break;

      case 'input':
        this.handleInput(conn, msg as {
          seq: number;
          keys: { left: boolean; right: boolean; up: boolean; powerHit: boolean };
          timestamp: number;
        });
        break;

      case 'rematch':
        this.handleRematch(conn);
        break;

      case 'ping':
        this.sendTo(conn.ws, { type: 'pong', timestamp: Date.now() });
        break;

      default:
        break;
    }
  }

  // --- Room Lifecycle ---

  private handleCreateRoom(conn: ClientConnection): void {
    if (this.rooms.size >= this.MAX_ROOMS) {
      this.sendTo(conn.ws, { type: 'error', message: '서버가 가득 찼습니다' });
      return;
    }

    // 이미 방에 있으면 나가기
    this.leaveCurrentRoom(conn);

    const roomId = this.generateRoomId();
    const room = new Room(roomId);
    room.onEmpty = () => {
      this.rooms.delete(roomId);
      console.log(`[Room] ${roomId} 폐기 (남은 방: ${this.rooms.size})`);
    };

    this.rooms.set(roomId, room);
    conn.roomId = roomId;

    const slotIndex = room.addPlayer(conn.ws, conn.playerId);
    if (slotIndex === -1) {
      this.sendTo(conn.ws, { type: 'error', message: '방 참가 실패' });
      return;
    }

    console.log(`[Room] ${roomId} 생성 — P${slotIndex + 1} 입장`);
  }

  private handleJoinRoom(conn: ClientConnection, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      this.sendTo(conn.ws, { type: 'error', message: '방을 찾을 수 없습니다' });
      return;
    }

    // 이미 방에 있으면 나가기
    this.leaveCurrentRoom(conn);

    conn.roomId = roomId;
    const slotIndex = room.addPlayer(conn.ws, conn.playerId);
    if (slotIndex === -1) {
      conn.roomId = null;
      this.sendTo(conn.ws, { type: 'error', message: '방이 가득 찼습니다' });
      return;
    }

    console.log(`[Room] ${roomId} — P${slotIndex + 1} 입장 (${room.playerCount()}명)`);
  }

  private handleInput(conn: ClientConnection, msg: {
    seq: number;
    keys: { left: boolean; right: boolean; up: boolean; powerHit: boolean };
    timestamp: number;
  }): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    room?.handleInput(conn.playerId, msg);
  }

  private handleRematch(conn: ClientConnection): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    room?.handleRematch(conn.playerId);
  }

  private handleDisconnect(conn: ClientConnection): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    room?.removePlayer(conn.playerId);
    console.log(`[Room] ${conn.roomId} — 플레이어 연결 해제`);
  }

  private leaveCurrentRoom(conn: ClientConnection): void {
    if (!conn.roomId) return;
    const room = this.rooms.get(conn.roomId);
    room?.removePlayer(conn.playerId);
    conn.roomId = null;
  }

  // --- Utilities ---

  private sendTo(ws: WebSocket, msg: unknown): void {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }

  private generateRoomId(): string {
    // 6자리 영숫자 (충돌 시 재생성)
    let id: string;
    do {
      id = randomBytes(3).toString('hex').toUpperCase();
    } while (this.rooms.has(id));
    return id;
  }

  private generateId(bytes: number): string {
    return randomBytes(bytes).toString('hex');
  }
}
