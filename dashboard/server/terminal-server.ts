import { WebSocketServer, WebSocket } from "ws";
import { spawn } from "node:child_process";

const PORT = Number(process.env.TERMINAL_PORT || 3334);
const wss = new WebSocketServer({ port: PORT });

console.log(`Terminal WebSocket server listening on ws://localhost:${PORT}`);

wss.on("connection", (ws: WebSocket) => {
  const env = { ...process.env } as Record<string, string>;
  delete env.ANTHROPIC_API_KEY;
  const claudePath = env.CLAUDE_PATH || "/Users/jidong/.local/bin/claude";
  const cwd = process.cwd();
  let isFirstMessage = true;

  ws.send(JSON.stringify({ type: "output", data: "Claude CLI ready. Type your message and press Enter.\r\n\r\n" }));

  ws.on("message", (msg: Buffer) => {
    let parsed: { type: string; data: string };
    try {
      parsed = JSON.parse(msg.toString());
    } catch {
      return;
    }

    if (parsed.type !== "input") return;

    const userInput = parsed.data;
    if (!userInput.trim()) return;

    // Show user input
    ws.send(JSON.stringify({ type: "output", data: `\x1b[35m> ${userInput.trim()}\x1b[0m\r\n` }));

    // Build args: first message uses -p, subsequent use -p --continue
    const args = isFirstMessage
      ? ["-p", "--allowedTools", "Write,Edit,Read,Bash,Glob,Grep"]
      : ["-p", "--continue", "--allowedTools", "Write,Edit,Read,Bash,Glob,Grep"];

    isFirstMessage = false;

    const proc = spawn(claudePath, args, { cwd, env: env as NodeJS.ProcessEnv, stdio: ["pipe", "pipe", "pipe"] });

    proc.stdin?.write(userInput.trim());
    proc.stdin?.end();

    proc.stdout?.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Convert newlines for terminal display
        const text = data.toString().replace(/\n/g, "\r\n");
        ws.send(JSON.stringify({ type: "output", data: text }));
      }
    });

    proc.stderr?.on("data", (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        const text = data.toString().replace(/\n/g, "\r\n");
        ws.send(JSON.stringify({ type: "output", data: `\x1b[33m${text}\x1b[0m` }));
      }
    });

    proc.on("close", () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "output", data: "\r\n\x1b[36m─────────────────────────────────────\x1b[0m\r\n" }));
      }
    });
  });
});
