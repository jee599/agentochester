"use client";

import { useEffect, useRef, useState } from "react";

export default function Terminal() {
  const termRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const terminalRef = useRef<any>(null);

  useEffect(() => {
    let cleanup = false;

    async function init() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      if (cleanup || !termRef.current) return;

      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: "var(--font-geist-mono), monospace",
        convertEol: true,
        theme: {
          background: "#0f172a",
          foreground: "#e2e8f0",
          cursor: "#a78bfa",
          selectionBackground: "#6d28d9",
          black: "#1e293b",
          red: "#fb7185",
          green: "#4ade80",
          yellow: "#fbbf24",
          blue: "#60a5fa",
          magenta: "#a78bfa",
          cyan: "#22d3ee",
          white: "#e2e8f0",
        },
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(termRef.current);
      fitAddon.fit();
      terminalRef.current = terminal;

      // Input buffer for line editing
      let inputBuffer = "";

      const ws = new WebSocket(`ws://localhost:3334`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("connected");
        terminal.write("\x1b[36m$ \x1b[0m");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "output") {
            terminal.write(msg.data);
          } else if (msg.type === "exit") {
            terminal.write("\r\n[Session ended]\r\n");
            setStatus("disconnected");
          }
        } catch {}
      };

      ws.onclose = () => setStatus("disconnected");
      ws.onerror = () => setStatus("disconnected");

      // Handle keyboard input — line-based
      terminal.onKey(({ key, domEvent }) => {
        if (domEvent.key === "Enter") {
          terminal.write("\r\n");
          if (inputBuffer.trim() && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "input", data: inputBuffer }));
          }
          inputBuffer = "";
          // Prompt will appear after response
        } else if (domEvent.key === "Backspace") {
          if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
            terminal.write("\b \b");
          }
        } else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.metaKey) {
          inputBuffer += key;
          terminal.write(key);
        }
      });

      // Re-show prompt after output finishes
      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "output" && msg.data.includes("─────")) {
            setTimeout(() => terminal.write("\x1b[36m$ \x1b[0m"), 100);
          }
        } catch {}
      });

      const observer = new ResizeObserver(() => fitAddon.fit());
      observer.observe(termRef.current);

      return () => {
        observer.disconnect();
        terminal.dispose();
        ws.close();
      };
    }

    init();

    return () => {
      cleanup = true;
      wsRef.current?.close();
      terminalRef.current?.dispose();
    };
  }, []);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-700/30">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            status === "connected" ? "bg-emerald-400" :
            status === "connecting" ? "bg-amber-400 animate-pulse" :
            "bg-slate-600"
          }`} />
          <span className="text-xs font-mono text-slate-400">
            {status === "connected" ? "Claude CLI — interactive" : status === "connecting" ? "connecting..." : "disconnected"}
          </span>
        </div>
        {status === "disconnected" && (
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-violet-400 hover:text-violet-300 font-mono cursor-pointer"
          >
            reconnect
          </button>
        )}
      </div>
      <div ref={termRef} className="h-[500px]" />
    </div>
  );
}
