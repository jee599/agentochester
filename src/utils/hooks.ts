import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export function installHook(cwd: string, global: boolean = false): void {
  const settingsDir = global ? path.join(os.homedir(), '.claude') : path.join(cwd, '.claude');
  const settingsFile = path.join(settingsDir, global ? 'settings.json' : 'settings.local.json');

  fs.mkdirSync(settingsDir, { recursive: true });

  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsFile)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    } catch {
      settings = {};
    }
  }

  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!settings.hooks) settings.hooks = {};
  const hooksObj = settings.hooks as Record<string, unknown[]>;
  if (!hooksObj.SessionStart) hooksObj.SessionStart = [];

  const hasOurHook = hooksObj.SessionStart.some((entry: unknown) => {
    const e = entry as Record<string, unknown>;
    if (Array.isArray(e.hooks)) return (e.hooks as Array<Record<string, unknown>>).some((h) => String(h.command ?? '').includes('AgentCrow'));
    if (e.command) return String(e.command).includes('AgentCrow');
    return false;
  });

  if (!hasOurHook) {
    const hookScript = `printf '\\033[95m🐦 AgentCrow active\\033[0m \\033[90m— auto-dispatch enabled (144 agents)\\033[0m\\n' >&2 && echo '<AGENTCROW_DISPATCH_RULES>
CRITICAL INSTRUCTION — AgentCrow is active.
When the user gives a complex request (2+ tasks like "build X with Y and Z"), you MUST:
1. Look in .claude/agents/ for matching agent .md files
2. Show dispatch plan using the format in CLAUDE.md (with ━━━ borders and role emojis)
3. Use the Agent tool to dispatch each agent with their .md file as the prompt
4. Do NOT do the work yourself. Delegate to agents.
5. After all agents complete, show: ━━━ 🐦 AgentCrow complete ━━━━━━━━━━━━━
Simple single-task requests: handle directly, no agents.
</AGENTCROW_DISPATCH_RULES>'`;

    hooksObj.SessionStart.push({
      matcher: '',
      hooks: [{
        type: 'command',
        command: hookScript,
      }],
    });
  }

  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
}

export function removeHook(cwd: string, global: boolean = false): void {
  const settingsDir = global ? path.join(os.homedir(), '.claude') : path.join(cwd, '.claude');
  const settingsFile = path.join(settingsDir, global ? 'settings.json' : 'settings.local.json');

  if (!fs.existsSync(settingsFile)) return;

  try {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
    if (settings.hooks?.SessionStart) {
      settings.hooks.SessionStart = settings.hooks.SessionStart.filter((entry: Record<string, unknown>) => {
        if (Array.isArray(entry.hooks)) return !(entry.hooks as Array<Record<string, unknown>>).some((h) => String(h.command ?? '').includes('AgentCrow'));
        if (entry.command) return !String(entry.command).includes('AgentCrow');
        return true;
      });
      if (settings.hooks.SessionStart.length === 0) delete settings.hooks.SessionStart;
      if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;
    }
    fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // settings file is malformed, skip
  }
}
