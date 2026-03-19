import { spawn } from "node:child_process";

interface DecomposedTask {
  id: string;
  role: string;
  action: string;
  depends_on: string[];
  file_scope: string[];
}

const SYSTEM_PROMPT = `You are a task decomposer for a multi-agent system. Given a user prompt, break it into independent tasks that specialized agents can handle.

Available agent roles:
- product_manager: PRD, specs, requirements, planning
- frontend_developer: React, Next.js, UI, web app, pages, components
- backend_architect: API, server, database, authentication
- ui_designer: visual design, wireframe, UI/UX
- qa_engineer: testing, E2E, unit tests, quality
- devops_automator: deploy, CI/CD, Docker, infrastructure
- security_auditor_deep: security audit, vulnerability
- korean_tech_writer: Korean docs, README, guides
- translator: i18n, localization, translation
- data_pipeline_engineer: data crawling, ETL, scraping, pipeline
- ai_engineer: AI, ML, LLM, model, inference
- game_designer: game design, mechanics, level design
- unreal_gas_specialist: Unreal Engine GAS, combat system
- refactoring_specialist: refactoring, code cleanup
- content_strategist: marketing, content, SNS

Rules:
1. Output ONLY valid JSON array. No markdown, no explanation.
2. Each task: {"id":"task_1","role":"one_of_above","action":"specific action description","depends_on":[],"file_scope":["path/"]}
3. Break into 2-6 tasks. Not too few, not too many.
4. If "기획서" or "plan" or "spec" mentioned, include product_manager first.
5. If "만들어" or "build" or "구현" mentioned, include frontend_developer.
6. If "테스트" or "test" mentioned, include qa_engineer with depends_on on implementation tasks.
7. If "문서" or "docs" mentioned, include korean_tech_writer.
8. action should be specific to what this agent should do for THIS prompt, not generic.
9. depends_on: docs and tests depend on implementation. Planning comes first.

Example input: "피카츄 배구 게임 만들어줘. 기획서부터 작성하고 구현해줘"
Example output:
[{"id":"task_1","role":"product_manager","action":"피카츄 배구 멀티플레이어 게임 기획서 작성 — 게임 규칙, 네트워크 구조, 리소스 요구사항 정의","depends_on":[],"file_scope":["docs/"]},{"id":"task_2","role":"game_designer","action":"피카츄 배구 게임 메커닉 설계 — 물리엔진, 충돌감지, 점수 시스템, 멀티플레이어 동기화","depends_on":["task_1"],"file_scope":["src/game/"]},{"id":"task_3","role":"frontend_developer","action":"피카츄 배구 웹 게임 UI 구현 — Canvas/WebGL 렌더링, 게임 루프, 입력 처리","depends_on":["task_1"],"file_scope":["src/","app/"]},{"id":"task_4","role":"backend_architect","action":"멀티플레이어 서버 구현 — WebSocket 기반 실시간 동기화, 매칭 시스템","depends_on":["task_1"],"file_scope":["src/server/"]},{"id":"task_5","role":"qa_engineer","action":"게임 테스트 — 물리엔진 단위테스트, 멀티플레이어 연결 테스트, 입력 지연 테스트","depends_on":["task_3","task_4"],"file_scope":["tests/"]}]`;

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;

    const proc = spawn("claude", ["-p", prompt], {
      shell: false,
      timeout: 30000,
      env,
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    proc.on("close", (code) => {
      if (code === 0 && stdout.trim()) resolve(stdout.trim());
      else reject(new Error(stderr || `exit ${code}`));
    });
    proc.on("error", reject);
  });
}

export async function smartDecompose(userPrompt: string): Promise<DecomposedTask[]> {
  const fullPrompt = `${SYSTEM_PROMPT}\n\nUser prompt: "${userPrompt}"\n\nOutput JSON array only:`;

  const raw = await runClaude(fullPrompt);

  // Extract JSON from response (might have markdown wrapping)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse decomposition result");
  }

  const tasks: DecomposedTask[] = JSON.parse(jsonMatch[0]);

  // Validate
  for (const task of tasks) {
    if (!task.id || !task.role || !task.action) {
      throw new Error("Invalid task structure");
    }
    if (!task.depends_on) task.depends_on = [];
    if (!task.file_scope) task.file_scope = [];
  }

  return tasks;
}
