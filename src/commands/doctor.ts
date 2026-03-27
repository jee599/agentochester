import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { c, VERSION, GLOBAL_DIR, GLOBAL_BUILTIN, GLOBAL_EXTERNAL, GLOBAL_MD } from '../utils/constants.js';

function check(label: string, ok: boolean, detail?: string): void {
  const icon = ok ? c.green('✓') : c.red('✗');
  const msg = detail ? `${label} ${c.dim(detail)}` : label;
  console.log(`  ${icon} ${msg}`);
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

export function cmdDoctor(): void {
  console.log();
  console.log(`  ${c.purple('🐦 AgentCrow Doctor')} ${c.dim(`v${VERSION}`)}`);
  console.log();

  let issues = 0;

  // 1. Node.js
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1), 10);
  const nodeOk = nodeMajor >= 18;
  check('Node.js', nodeOk, nodeOk ? nodeVersion : `${nodeVersion} (requires >= 18)`);
  if (!nodeOk) issues++;

  // 2. git
  const hasGit = commandExists('git');
  check('git', hasGit, hasGit ? 'installed' : 'not found — needed for external agents');
  if (!hasGit) issues++;

  // 3. claude CLI
  const hasClaude = commandExists('claude');
  check('claude CLI', hasClaude, hasClaude ? 'installed' : 'not found — needed for compose');
  if (!hasClaude) issues++;

  // 4. Global agent storage
  const hasGlobalDir = fs.existsSync(GLOBAL_DIR);
  check('Global storage', hasGlobalDir, hasGlobalDir ? GLOBAL_DIR : 'not found — run agentcrow init --global');
  if (!hasGlobalDir) issues++;

  // 5. Builtin agents
  let builtinCount = 0;
  if (fs.existsSync(GLOBAL_BUILTIN)) {
    builtinCount = fs.readdirSync(GLOBAL_BUILTIN).filter((f) => f.endsWith('.yaml')).length;
  }
  check('Builtin agents', builtinCount > 0, `${builtinCount} found`);
  if (builtinCount === 0) issues++;

  // 6. External agents
  const hasExternal = fs.existsSync(GLOBAL_EXTERNAL);
  let externalDivisions = 0;
  if (hasExternal) {
    externalDivisions = fs.readdirSync(GLOBAL_EXTERNAL, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
  }
  check('External agents', hasExternal, hasExternal ? `${externalDivisions} divisions` : 'not downloaded');
  if (!hasExternal) issues++;

  // 7. MD definitions
  let mdCount = 0;
  if (fs.existsSync(GLOBAL_MD)) {
    mdCount = fs.readdirSync(GLOBAL_MD).filter((f) => f.endsWith('.md')).length;
  }
  check('Agent definitions (.md)', mdCount > 0, `${mdCount} files`);
  if (mdCount === 0) issues++;

  // 8. Project CLAUDE.md
  const projectClaudeMd = path.join(process.cwd(), '.claude', 'CLAUDE.md');
  const hasProjectClaude = fs.existsSync(projectClaudeMd);
  let projectHasAgentCrow = false;
  if (hasProjectClaude) {
    const content = fs.readFileSync(projectClaudeMd, 'utf-8');
    projectHasAgentCrow = content.includes('AgentCrow');
  }
  check('Project CLAUDE.md', hasProjectClaude, hasProjectClaude
    ? (projectHasAgentCrow ? 'has AgentCrow section' : 'exists but no AgentCrow section')
    : 'not found');

  // 9. Global CLAUDE.md
  const globalClaudeMd = path.join(os.homedir(), '.claude', 'CLAUDE.md');
  const hasGlobalClaude = fs.existsSync(globalClaudeMd);
  let globalHasAgentCrow = false;
  if (hasGlobalClaude) {
    const content = fs.readFileSync(globalClaudeMd, 'utf-8');
    globalHasAgentCrow = content.includes('AgentCrow');
  }
  check('Global CLAUDE.md', hasGlobalClaude && globalHasAgentCrow,
    hasGlobalClaude
      ? (globalHasAgentCrow ? 'has AgentCrow section' : 'exists but no AgentCrow section')
      : 'not found');

  // 10. Symlink check
  const projectAgentsDir = path.join(process.cwd(), '.claude', 'agents');
  let symlinkOk = false;
  let symlinkTarget = '';
  try {
    const stat = fs.lstatSync(projectAgentsDir);
    if (stat.isSymbolicLink()) {
      symlinkTarget = fs.readlinkSync(projectAgentsDir);
      symlinkOk = symlinkTarget === GLOBAL_MD;
    }
  } catch {
    // doesn't exist
  }
  check('Project agents symlink', symlinkOk,
    symlinkOk ? `→ ${symlinkTarget}` : (fs.existsSync(projectAgentsDir) ? 'exists but not a symlink' : 'not found'));

  // 11. Settings hook
  const settingsFiles = [
    { label: 'project', path: path.join(process.cwd(), '.claude', 'settings.local.json') },
    { label: 'global', path: path.join(os.homedir(), '.claude', 'settings.json') },
  ];
  for (const sf of settingsFiles) {
    let hookOk = false;
    if (fs.existsSync(sf.path)) {
      try {
        const settings = JSON.parse(fs.readFileSync(sf.path, 'utf-8'));
        hookOk = JSON.stringify(settings).includes('AgentCrow');
      } catch {
        // malformed
      }
    }
    check(`SessionStart hook (${sf.label})`, hookOk, hookOk ? 'installed' : 'not found');
  }

  // Summary
  console.log();
  if (issues === 0) {
    console.log(`  ${c.green('✓')} All checks passed!`);
  } else {
    console.log(`  ${c.yellow('⚠')} ${issues} issue(s) found. Run ${c.cyan('agentcrow init --global')} to fix.`);
  }
  console.log();
}
