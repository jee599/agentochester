// 게임 서버 엔트리 포인트
import { GameServer } from './game-server';

const PORT = Number(process.env.GAME_PORT) || 8080;

const server = new GameServer(PORT);
server.start();

// Graceful shutdown
function shutdown() {
  console.log('\n[GameServer] 종료 중...');
  server.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
