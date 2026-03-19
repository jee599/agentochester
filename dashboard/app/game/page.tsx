'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { GameMode } from '@/src/game/client/game-client';

// Canvas는 SSR 불가 — dynamic import
const GameCanvas = dynamic(() => import('@/src/game/client/GameCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[608px] bg-black/50 rounded border-2 border-slate-700">
      <div className="text-yellow-400 animate-pulse">로딩 중...</div>
    </div>
  ),
});

type LobbyView = 'menu' | 'create' | 'join' | 'playing';

export default function GamePage() {
  const [view, setView] = useState<LobbyView>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [roomId, setRoomId] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState('');

  const serverUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

  const handleLocalPlay = () => {
    setGameMode('local');
    setView('playing');
  };

  const handleCreateRoom = () => {
    setGameMode('online');
    setView('playing');
  };

  const handleJoinRoom = () => {
    if (!joinInput.trim()) return;
    setGameMode('online');
    setRoomId(joinInput.trim());
    setView('playing');
  };

  const handleRoomCreated = useCallback((id: string) => {
    setCreatedRoomId(id);
  }, []);

  const handleBack = useCallback(() => {
    setView('menu');
    setCreatedRoomId(null);
    setRoomId('');
  }, []);

  const handleCopyLink = () => {
    if (!createdRoomId) return;
    const url = `${window.location.origin}/game?room=${createdRoomId}`;
    navigator.clipboard.writeText(url);
  };

  // URL 파라미터로 방 참가
  if (typeof window !== 'undefined' && view === 'menu') {
    const params = new URLSearchParams(window.location.search);
    const urlRoom = params.get('room');
    if (urlRoom) {
      setGameMode('online');
      setRoomId(urlRoom);
      setView('playing');
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      {view === 'menu' && (
        <div className="text-center space-y-8">
          {/* 타이틀 */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-yellow-400 tracking-tight" style={{ fontFamily: 'monospace' }}>
              PIKACHU VOLLEYBALL
            </h1>
            <p className="text-slate-500 text-sm">1997 Original Recreation — Multiplayer Edition</p>
          </div>

          {/* 메뉴 버튼 */}
          <div className="flex flex-col gap-3 w-72 mx-auto">
            <button
              onClick={handleLocalPlay}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg text-lg transition-all hover:scale-105 active:scale-95"
            >
              로컬 대전
            </button>
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded-lg text-lg transition-all hover:scale-105 active:scale-95"
            >
              방 만들기
            </button>
            <button
              onClick={() => setView('join')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 font-bold rounded-lg text-lg transition-all hover:scale-105 active:scale-95"
            >
              방 참가
            </button>
          </div>

          {/* 조작법 */}
          <div className="text-sm text-slate-500 space-y-1">
            <p>P1: ← → ↑ 이동/점프 | D 파워히트</p>
            <p>P2: A D W 이동/점프 | F 파워히트</p>
          </div>
        </div>
      )}

      {view === 'create' && (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-yellow-400">온라인 방 만들기</h2>
          <p className="text-slate-400">방을 만들고 친구에게 링크를 공유하세요</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleCreateRoom}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all hover:scale-105"
            >
              방 만들기
            </button>
            <button
              onClick={() => setView('menu')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {view === 'join' && (
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-bold text-yellow-400">방 참가</h2>
          <p className="text-slate-400">방 코드를 입력하세요</p>
          <div className="flex gap-2 justify-center">
            <input
              type="text"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              placeholder="방 코드 입력..."
              className="px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-center font-mono text-lg w-48 focus:outline-none focus:border-yellow-500"
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
            />
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleJoinRoom}
              disabled={!joinInput.trim()}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              참가
            </button>
            <button
              onClick={() => setView('menu')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
            >
              뒤로
            </button>
          </div>
        </div>
      )}

      {view === 'playing' && (
        <div className="space-y-4">
          <GameCanvas
            mode={gameMode}
            serverUrl={gameMode === 'online' ? serverUrl : undefined}
            roomId={roomId || undefined}
            onRoomCreated={handleRoomCreated}
            onBack={handleBack}
          />

          {/* 방 링크 공유 (온라인 방 생성 후) */}
          {createdRoomId && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-slate-400">방 코드:</span>
              <code className="px-2 py-1 bg-slate-800 rounded font-mono">{createdRoomId}</code>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
              >
                링크 복사
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
