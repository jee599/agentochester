import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package root (dist/utils/ -> .)
export const PKG_ROOT = path.resolve(__dirname, '..', '..');
export const BUILTIN_DIR = path.join(PKG_ROOT, 'agents', 'builtin');
export const EXTERNAL_DIR = path.join(PKG_ROOT, 'agents', 'external', 'agency-agents');

export const AGENTCROW_START = '<!-- AgentCrow Start -->';
export const AGENTCROW_END = '<!-- AgentCrow End -->';

// Global agent storage
export const GLOBAL_DIR = path.join(os.homedir(), '.agentcrow', 'agents');
export const GLOBAL_BUILTIN = path.join(GLOBAL_DIR, 'builtin');
export const GLOBAL_EXTERNAL = path.join(GLOBAL_DIR, 'external', 'agency-agents');
export const GLOBAL_MD = path.join(GLOBAL_DIR, 'md');

// Read version from package.json (single source of truth)
export const VERSION = (() => {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf-8'));
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
})();

// ANSI colors
export const c = {
  purple: (s: string) => `\x1b[95m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  bgPurple: (s: string) => `\x1b[105m\x1b[37m${s}\x1b[0m`,
};

// Role emoji map
export const ROLE_EMOJI: Record<string, string> = {
  frontend: '🖥️', ui: '🖥️',
  backend: '🏗️', api: '🏗️', architect: '🏗️',
  qa: '🧪', test: '🧪',
  security: '🛡️', auditor: '🛡️',
  writer: '📝', docs: '📝', translator: '📝',
  data: '🔄', pipeline: '🔄',
  design: '🎨', ux: '🎨',
  devops: '⚙️', sre: '⚙️',
  game: '🎮', level: '🎮', unity: '🎮', unreal: '🎮', godot: '🎮',
  ai: '🤖', ml: '🤖',
  marketing: '📢', seo: '📢', content: '📢',
  product: '📊', analyst: '📊',
  mobile: '📱',
  refactoring: '♻️',
  complexity: '🔍',
};

export function getAgentDirs(): { bDir: string; eDir: string } {
  const bDir = fs.existsSync(GLOBAL_BUILTIN) ? GLOBAL_BUILTIN : BUILTIN_DIR;
  const eDir = fs.existsSync(GLOBAL_EXTERNAL) ? GLOBAL_EXTERNAL : EXTERNAL_DIR;
  return { bDir, eDir };
}

export function getRoleEmoji(role: string): string {
  for (const [key, emoji] of Object.entries(ROLE_EMOJI)) {
    if (role.includes(key)) return emoji;
  }
  return '🐦';
}
