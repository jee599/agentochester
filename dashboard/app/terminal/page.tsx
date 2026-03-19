"use client";

import dynamic from "next/dynamic";

const Terminal = dynamic(() => import("@/components/Terminal"), { ssr: false });

export default function TerminalPage() {
  return (
    <div>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5/css/xterm.min.css" />
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-white tracking-tight">Terminal</h1>
        <p className="text-sm text-slate-500 mt-0.5">Interactive Claude CLI — full permissions, real-time</p>
      </div>
      <Terminal />
    </div>
  );
}
