'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { GameClient, type ClientPhase, type GameMode } from './game-client';
import type { ConnectionStatus } from './network-client';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer';

interface GameCanvasProps {
  mode: GameMode;
  serverUrl?: string;
  roomId?: string;
  onRoomCreated?: (roomId: string) => void;
  onBack?: () => void;
}

export default function GameCanvas({
  mode,
  serverUrl,
  roomId,
  onRoomCreated,
  onBack,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clientRef = useRef<GameClient | null>(null);

  const [phase, setPhase] = useState<ClientPhase>('loading');
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [winner, setWinner] = useState<0 | 1 | null>(null);
  const [muted, setMuted] = useState(false);
  const [connStatus, setConnStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const initGame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const client = new GameClient({
      onPhaseChange: setPhase,
      onRoomCreated: (id) => onRoomCreated?.(id),
      onScoreUpdate: setScores,
      onGameOver: setWinner,
      onConnectionChange: setConnStatus,
      onError: setError,
    });

    clientRef.current = client;

    await client.init(canvas);

    if (mode === 'local') {
      client.startLocalGame();
    } else if (mode === 'online' && serverUrl) {
      if (roomId) {
        client.joinOnlineRoom(serverUrl, roomId);
      } else {
        client.createOnlineRoom(serverUrl);
      }
    }
  }, [mode, serverUrl, roomId, onRoomCreated]);

  useEffect(() => {
    initGame();
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, [initGame]);

  const handleRematch = () => {
    setWinner(null);
    setScores([0, 0]);
    clientRef.current?.rematch();
  };

  const handleToggleMute = () => {
    const newMuted = clientRef.current?.toggleMute() ?? false;
    setMuted(newMuted);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 상단 상태 바 */}
      <div className="flex items-center justify-between w-full max-w-[864px]">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded transition-colors"
        >
          ← 로비로
        </button>

        <div className="flex items-center gap-3">
          {mode === 'online' && (
            <span className={`text-xs px-2 py-1 rounded ${
              connStatus === 'connected' ? 'bg-green-900/50 text-green-400' :
              connStatus === 'connecting' || connStatus === 'reconnecting' ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {connStatus === 'connected' ? '연결됨' :
               connStatus === 'connecting' ? '연결 중...' :
               connStatus === 'reconnecting' ? '재연결 중...' : '연결 끊김'}
            </span>
          )}

          <div className="text-lg font-mono font-bold tracking-wider">
            <span className="text-yellow-400">{scores[0]}</span>
            <span className="text-slate-500 mx-2">:</span>
            <span className="text-yellow-400">{scores[1]}</span>
          </div>

          <button
            onClick={handleToggleMute}
            className="px-2 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded transition-colors"
            title={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 캔버스 */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border-2 border-slate-700 rounded bg-black"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            imageRendering: 'pixelated',
          }}
        />

        {/* 로딩 오버레이 */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded">
            <div className="text-center">
              <div className="text-lg text-yellow-400 animate-pulse">로딩 중...</div>
            </div>
          </div>
        )}

        {/* 대기 오버레이 (온라인) */}
        {phase === 'waiting' && mode === 'online' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded">
            <div className="text-center space-y-3">
              <div className="text-lg text-yellow-400">상대를 기다리는 중...</div>
              {clientRef.current?.getRoomId() && (
                <div className="text-sm text-slate-400">
                  방 코드: <span className="text-white font-mono">{clientRef.current.getRoomId()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 게임 오버 오버레이 */}
        {phase === 'gameOver' && winner !== null && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold text-yellow-400">
                {mode === 'local' ? `P${winner + 1} 승리!` : (winner === 0 ? '승리!' : '패배...')}
              </div>
              <div className="text-lg text-slate-300">
                {scores[0]} : {scores[1]}
              </div>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleRematch}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded transition-colors"
                >
                  다시 하기
                </button>
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
                >
                  로비로
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 조작법 안내 */}
      <div className="flex gap-8 text-xs text-slate-500">
        <div>
          <span className="text-slate-400 font-bold">P1</span>{' '}
          ← → ↑ 이동/점프 | D 파워히트
        </div>
        {mode === 'local' && (
          <div>
            <span className="text-slate-400 font-bold">P2</span>{' '}
            A D W 이동/점프 | F 파워히트
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
