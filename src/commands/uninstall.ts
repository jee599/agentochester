import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { removeHook } from '../utils/hooks.js';
import { removeMcpServer } from '../utils/mcp-config.js';
import { c, AGENTCROW_START, AGENTCROW_END } from '../utils/constants.js';

export function cmdUninstall(): void {
  console.log();
  console.log(`  ${c.purple('🐦 AgentCrow')} — uninstalling`);
  console.log();

  // 1. Remove global agent storage
  const globalAgentCrow = path.join(os.homedir(), '.agentcrow');
  if (fs.existsSync(globalAgentCrow)) {
    fs.rmSync(globalAgentCrow, { recursive: true, force: true });
    console.log(`  ${c.green('▸')} Removed ${c.dim(globalAgentCrow)}`);
  }

  // 2. Clean up CLAUDE.md (both project and global)
  const scopes = [
    { label: 'project', base: path.join(process.cwd(), '.claude') },
    { label: 'global', base: path.join(os.homedir(), '.claude') },
  ];

  for (const { label, base } of scopes) {
    // Remove agents symlink
    const agentsDir = path.join(base, 'agents');
    try {
      const stat = fs.lstatSync(agentsDir);
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(agentsDir);
        console.log(`  ${c.green('▸')} Removed agents symlink ${c.dim(`(${label})`)}`);
      }
    } catch {
      // doesn't exist
    }

    // Strip AgentCrow section from CLAUDE.md
    const claudeMd = path.join(base, 'CLAUDE.md');
    if (fs.existsSync(claudeMd)) {
      const content = fs.readFileSync(claudeMd, 'utf-8');
      const startIdx = content.indexOf(AGENTCROW_START);
      const endIdx = content.indexOf(AGENTCROW_END);

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const before = content.slice(0, startIdx);
        const after = content.slice(endIdx + AGENTCROW_END.length);
        const remaining = (before + after).replace(/\n{3,}/g, '\n\n').trim();

        if (remaining.length > 0) {
          fs.writeFileSync(claudeMd, remaining + '\n', 'utf-8');
          console.log(`  ${c.green('▸')} Cleaned CLAUDE.md ${c.dim(`(${label})`)}`);
        } else {
          fs.unlinkSync(claudeMd);
          console.log(`  ${c.green('▸')} Removed CLAUDE.md ${c.dim(`(${label})`)}`);
        }
      }
    }

    // Remove backup
    const backupMd = path.join(base, 'CLAUDE.md.agentcrow-backup');
    if (fs.existsSync(backupMd)) {
      fs.unlinkSync(backupMd);
      console.log(`  ${c.green('▸')} Removed backup ${c.dim(`(${label})`)}`);
    }

    // Remove hook
    removeHook(label === 'global' ? os.homedir() : process.cwd(), label === 'global');
    console.log(`  ${c.green('▸')} Removed hook ${c.dim(`(${label})`)}`);

    // Remove MCP server
    removeMcpServer(label === 'global');
    console.log(`  ${c.green('▸')} Removed MCP server ${c.dim(`(${label})`)}`);
  }

  console.log();
  console.log(`  ${c.green('✓')} AgentCrow uninstalled.`);
  console.log(`  ${c.dim('To also remove the npm package: npm uninstall -g agentcrow')}`);
  console.log();
}
