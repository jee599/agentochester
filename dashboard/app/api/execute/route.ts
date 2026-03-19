import { NextRequest } from "next/server";
import { spawn } from "node:child_process";
import { smartDecompose } from "@/lib/smart-decomposer";
import { decomposePrompt } from "@/lib/decomposer";
import { matchAgent, getAgentsResponse } from "@/lib/agents-handler";

function runClaude(
  prompt: string,
  cwd: string,
  onChunk: (chunk: string) => void,
  timeoutMs: number = 600000,
): Promise<{ success: boolean; output: string; error?: string; durationMs: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const proc = spawn("claude", ["-p", "--allowedTools", "Write,Edit,Read,Bash,Glob,Grep"], {
      cwd,
      shell: false,
      timeout: timeoutMs,
      env,
    });

    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => {
      const chunk = d.toString();
      stdout += chunk;
      onChunk(chunk);
    });

    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        output: stdout.trim(),
        error: code !== 0 ? (stderr.trim() || `Exit code: ${code}`) : undefined,
        durationMs: Date.now() - start,
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: "",
        error: err.message,
        durationMs: Date.now() - start,
      });
    });
  });
}

function assembleTeamPrompt(
  tasks: Array<{ task: { id: string; role: string; action: string; depends_on: string[]; file_scope: string[] }; agent: { name: string; role: string; description: string } }>,
  originalPrompt: string,
): string {
  const sections: string[] = [];

  sections.push("You are an Agent Teams orchestrator. You have a team of specialized agents.");
  sections.push("Execute ALL tasks below in order. For each task, adopt the agent's role and complete the work.");
  sections.push("Do NOT ask questions. Make decisions and proceed.");
  sections.push("Create actual files and write actual code.");
  sections.push("After completing each task, clearly mark it as [DONE: task_id].");
  sections.push("");
  sections.push(`# Original Request`);
  sections.push(originalPrompt);
  sections.push("");

  for (const { task, agent } of tasks) {
    sections.push("---");
    sections.push(`## ${task.id}: ${agent.name} (${task.role})`);
    sections.push(`Task: ${task.action}`);
    if (task.depends_on.length > 0) {
      sections.push(`Depends on: ${task.depends_on.join(", ")} — use their outputs.`);
    }
    if (task.file_scope.length > 0) {
      sections.push(`File scope: ${task.file_scope.join(", ")}`);
    }
    sections.push("");
  }

  sections.push("---");
  sections.push("## Final: Orchestrator Summary");
  sections.push("After all tasks, write a summary: what was done, how pieces connect, and next steps.");

  return sections.join("\n");
}

export async function POST(request: NextRequest) {
  const { prompt, workingDir } = await request.json();

  if (!prompt || typeof prompt !== "string") {
    return new Response(JSON.stringify({ error: "prompt is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 1. Decompose
  let tasks;
  try {
    tasks = await smartDecompose(prompt);
  } catch {
    tasks = decomposePrompt(prompt);
  }

  // 2. Match agents
  const matched = await Promise.all(
    tasks.map(async (task) => {
      const result = await matchAgent(task.role, task.action);
      return { task, agent: result.agent };
    })
  );

  const executable = matched.filter((m) => m.agent !== null) as Array<{
    task: (typeof tasks)[0];
    agent: NonNullable<(typeof matched)[0]["agent"]>;
  }>;

  if (executable.length === 0) {
    return new Response(JSON.stringify({ error: "No agents matched" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 3. Assemble ONE team prompt
  const teamPrompt = assembleTeamPrompt(executable, prompt);

  // 4. Execute as single claude session — SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      const cwd = workingDir || process.cwd();

      // Send plan
      send("plan", {
        tasks: executable.map((e) => ({
          id: e.task.id,
          role: e.task.role,
          agentName: e.agent.name,
          depends_on: e.task.depends_on,
        })),
      });

      // Single execution — team prompt
      send("task_start", {
        taskId: "team",
        role: "agent_teams",
        agentName: `Agent Teams (${executable.length} agents)`,
        status: "running",
      });

      const result = await runClaude(teamPrompt, cwd, (chunk) => {
        send("task_output", { taskId: "team", chunk });

        // Detect [DONE: task_id] markers to update individual task status
        const doneMatch = chunk.match(/\[DONE:\s*(task_\d+)\]/);
        if (doneMatch) {
          const taskId = doneMatch[1];
          const info = executable.find((e) => e.task.id === taskId);
          if (info) {
            send("task_done", {
              taskId,
              role: info.task.role,
              agentName: info.agent.name,
              status: "success",
              durationMs: 0,
            });
          }
        }
      });

      send("task_done", {
        taskId: "team",
        role: "agent_teams",
        agentName: `Agent Teams (${executable.length} agents)`,
        status: result.success ? "success" : "error",
        output: result.output,
        error: result.error,
        durationMs: result.durationMs,
      });

      send("done", { totalDurationMs: result.durationMs });
      controller.close();
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
