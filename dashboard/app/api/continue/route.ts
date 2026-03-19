import { NextRequest } from "next/server";
import { spawn } from "node:child_process";

export async function POST(request: NextRequest) {
  const { message, cwd } = await request.json();

  if (!message) {
    return new Response(JSON.stringify({ error: "message required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: string) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: data })}\n\n`));
      }

      const proc = spawn("claude", ["-p", "--continue", "--allowedTools", "Write,Edit,Read,Bash,Glob,Grep"], {
        cwd: cwd || process.cwd(),
        shell: false,
        timeout: 600000,
        env,
      });

      proc.stdin.write(message);
      proc.stdin.end();

      proc.stdout.on("data", (d) => send(d.toString()));
      proc.stderr.on("data", (d) => send(`[stderr] ${d.toString()}`));

      proc.on("close", () => {
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      });

      proc.on("error", (err) => {
        send(`[error] ${err.message}`);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
