import * as fs from 'node:fs';
import { AgentManager } from '../core/agent-manager.js';
import { AgentCatalog } from '../core/catalog.js';
import { c, VERSION, BUILTIN_DIR, GLOBAL_BUILTIN, EXTERNAL_DIR, GLOBAL_EXTERNAL, getRoleEmoji } from '../utils/constants.js';

function getAgentDirs(): { bDir: string; eDir: string } {
  const bDir = fs.existsSync(GLOBAL_BUILTIN) ? GLOBAL_BUILTIN : BUILTIN_DIR;
  const eDir = fs.existsSync(GLOBAL_EXTERNAL) ? GLOBAL_EXTERNAL : EXTERNAL_DIR;
  return { bDir, eDir };
}

export async function cmdAgents(): Promise<void> {
  const { bDir, eDir } = getAgentDirs();
  const manager = new AgentManager(bDir, eDir);
  await manager.initialize();

  console.log(`\n  ${c.purple('🐦 AgentCrow')} ${c.dim(`v${VERSION}`)}\n`);

  const divisions = manager.listAgents();
  let totalCount = 0;

  for (const { division, agents } of divisions) {
    const divColor = division === 'builtin' ? c.yellow : c.cyan;
    console.log(`  ${divColor(`[${division}]`)} ${c.dim(`(${agents.length})`)}`);
    for (const agent of agents) {
      const emoji = getRoleEmoji(agent.role);
      const sourceTag = agent.source === 'builtin' ? c.yellow('builtin') : c.cyan('external');
      console.log(`    ${emoji} ${sourceTag} ${c.bold(agent.role)} ${c.dim('—')} ${agent.name}`);
      if (agent.description) {
        console.log(`       ${c.dim(agent.description.slice(0, 80))}`);
      }
    }
    totalCount += agents.length;
    console.log();
  }

  console.log(`  ${c.dim(`Total: ${totalCount} agents`)}`);
}

export async function cmdAgentsSearch(query: string): Promise<void> {
  const { bDir, eDir } = getAgentDirs();
  const catalog = new AgentCatalog(bDir, eDir);
  await catalog.build();

  const queryTags = query.split(/[\s,]+/).filter((t) => t.length > 0);
  const results = catalog.searchByTags(queryTags, 20);

  if (results.length === 0) {
    console.log(`No agents found for "${query}"`);
    return;
  }

  console.log(`\n  ${c.purple('🐦')} Search: ${c.bold(`"${query}"`)}\n`);
  for (const { entry, score } of results) {
    const emoji = getRoleEmoji(entry.role);
    const sourceTag = entry.source.type === 'builtin' ? c.yellow('builtin') : c.cyan('external');
    console.log(`  ${emoji} ${sourceTag} ${c.bold(entry.role)} ${c.dim(`score:${score.toFixed(1)}`)} — ${entry.name}`);
    if (entry.description) {
      console.log(`     ${c.dim(entry.description.slice(0, 80))}`);
    }
  }

  console.log(`\n  ${c.dim(`${results.length} results`)}`);
}
