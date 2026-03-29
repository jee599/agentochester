import * as fs from 'node:fs';
import { loadCatalogIndex } from '../utils/catalog-index.js';
import { recordDispatch, loadHistory } from '../utils/history.js';
import type { AgentDefinition } from '../core/types.js';

// Claude Code built-in subagent types — do NOT inject persona for these
const BUILTIN_SUBAGENT_TYPES = new Set([
  'Explore', 'Plan', 'general-purpose',
  'statusline-setup', 'claude-code-guide',
]);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was',
  'will', 'can', 'has', 'have', 'been', 'into', 'not', 'but', 'also',
  'just', 'than', 'then', 'when', 'what', 'how', 'all', 'each',
  'about', 'would', 'make', 'like', 'use', 'using', 'used',
  'create', 'build', 'implement', 'add', 'write', 'update', 'fix',
  'should', 'need', 'want', 'please', 'help', 'code', 'file', 'new',
]);

// Synonym map: keyword → expanded terms for better fuzzy matching
const SYNONYMS: Record<string, string[]> = {
  test: ['testing', 'qa', 'test', 'spec', 'jest', 'vitest', 'playwright'],
  tests: ['testing', 'qa', 'test', 'spec'],
  testing: ['test', 'qa', 'spec'],
  frontend: ['react', 'vue', 'angular', 'ui', 'css', 'frontend'],
  react: ['frontend', 'ui', 'jsx', 'tsx'],
  vue: ['frontend', 'ui'],
  backend: ['api', 'server', 'database', 'backend', 'rest', 'graphql'],
  api: ['backend', 'rest', 'server', 'endpoint'],
  database: ['backend', 'sql', 'postgres', 'mongodb'],
  security: ['audit', 'vulnerability', 'auth', 'security'],
  auth: ['security', 'authentication', 'authorization'],
  devops: ['deploy', 'ci', 'cd', 'docker', 'kubernetes', 'devops', 'sre'],
  deploy: ['devops', 'ci', 'cd'],
  docker: ['devops', 'container', 'kubernetes'],
  design: ['ui', 'ux', 'figma', 'design', 'layout'],
  ux: ['design', 'usability', 'user', 'research'],
  docs: ['documentation', 'readme', 'technical', 'writer'],
  documentation: ['docs', 'writer', 'technical'],
  mobile: ['ios', 'android', 'react-native', 'flutter'],
  game: ['unity', 'unreal', 'godot', 'gamedev'],
  ai: ['ml', 'machine', 'learning', 'model', 'neural', 'llm', 'rag'],
  ml: ['ai', 'machine', 'learning', 'model', 'llm'],
  llm: ['ai', 'ml', 'langchain', 'rag', 'prompt', 'embedding'],
  rag: ['ai', 'llm', 'embedding', 'vector', 'retrieval'],
  embedding: ['ai', 'vector', 'rag', 'llm'],
  marketing: ['seo', 'content', 'social', 'brand'],
  seo: ['marketing', 'search', 'optimization'],
  stripe: ['payment', 'billing', 'checkout'],
  payment: ['stripe', 'billing', 'checkout'],
  refactor: ['refactoring', 'cleanup', 'restructure'],
  performance: ['optimization', 'speed', 'benchmark', 'profiling'],
  landing: ['frontend', 'ui', 'page', 'marketing'],
  dashboard: ['frontend', 'ui', 'charts', 'analytics'],
  charts: ['frontend', 'dashboard', 'visualization', 'data'],
  kubernetes: ['devops', 'k8s', 'infrastructure', 'deployment', 'container'],
  k8s: ['kubernetes', 'devops', 'infrastructure'],
  terraform: ['devops', 'infrastructure', 'iac'],
  helm: ['kubernetes', 'devops', 'k8s'],
  aws: ['devops', 'infrastructure', 'cloud'],
  gcp: ['devops', 'infrastructure', 'cloud'],
  translate: ['translation', 'i18n', 'localization', 'language'],
  translation: ['translate', 'i18n', 'localization'],
  i18n: ['translate', 'translation', 'localization'],
  localization: ['translate', 'i18n', 'translation'],
  pipeline: ['cicd', 'data', 'etl', 'streaming'],
  etl: ['pipeline', 'data', 'transformation'],
  complexity: ['refactoring', 'code-review', 'simplification'],
  review: ['code-review', 'audit', 'quality'],
  vulnerability: ['security', 'audit', 'owasp', 'cve'],
  audit: ['security', 'review', 'compliance'],
};

function extractKeywords(text: string): string[] {
  const raw = text
    .toLowerCase()
    .split(/[\s,./:()\[\]{}"'`]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  // Expand with synonyms
  const expanded = new Set(raw);
  for (const word of raw) {
    const syns = SYNONYMS[word];
    if (syns) {
      for (const syn of syns) expanded.add(syn);
    }
  }

  return [...expanded];
}

// === Model Auto-Selection ===
// Determine optimal model based on agent role + prompt complexity
const OPUS_ROLES = new Set([
  'security_auditor_deep', 'backend_architect', 'ai_engineer',
  'compose_meta_reviewer', 'complexity_critic', 'refactoring_specialist',
]);
function selectModel(agent: AgentDefinition, prompt: string): 'opus' | 'sonnet' {
  // Role-based override
  if (OPUS_ROLES.has(agent.role)) return 'opus';

  // Complexity heuristics from prompt
  const promptLen = prompt.length;
  const complexKeywords = ['architect', 'refactor', 'migrate', 'security', 'audit', 'design system', 'performance'];

  const hasComplex = complexKeywords.some(k => prompt.toLowerCase().includes(k));

  if (hasComplex && promptLen > 500) return 'opus';
  return 'sonnet';
}

// === File Path Signal Scoring ===
const FILE_PATH_SIGNALS: Record<string, { role: string; bonus: number }[]> = {
  '.test.ts': [{ role: 'qa_engineer', bonus: 5 }],
  '.test.tsx': [{ role: 'qa_engineer', bonus: 5 }],
  '.spec.ts': [{ role: 'qa_engineer', bonus: 5 }],
  '.spec.tsx': [{ role: 'qa_engineer', bonus: 5 }],
  'vitest': [{ role: 'qa_engineer', bonus: 4 }],
  'jest': [{ role: 'qa_engineer', bonus: 4 }],
  'playwright': [{ role: 'qa_engineer', bonus: 4 }],
  '/api/': [{ role: 'backend_architect', bonus: 4 }],
  'endpoint': [{ role: 'backend_architect', bonus: 3 }],
  'prisma': [{ role: 'backend_architect', bonus: 4 }],
  '.tsx': [{ role: 'frontend_developer', bonus: 3 }],
  'component': [{ role: 'frontend_developer', bonus: 3 }],
  'tailwind': [{ role: 'frontend_developer', bonus: 3 }],
  'README': [{ role: 'technical_writer', bonus: 5 }],
  '/docs/': [{ role: 'technical_writer', bonus: 4 }],
  'Dockerfile': [{ role: 'devops_automator', bonus: 5 }],
  'docker-compose': [{ role: 'devops_automator', bonus: 5 }],
  'docker': [{ role: 'devops_automator', bonus: 3 }],
  '.github/workflows': [{ role: 'devops_automator', bonus: 5 }],
  'OWASP': [{ role: 'security_auditor_deep', bonus: 5 }],
  'vulnerability': [{ role: 'security_auditor_deep', bonus: 4 }],
};

function getFilePathBonus(prompt: string): Record<string, number> {
  const bonuses: Record<string, number> = {};
  const lowerPrompt = prompt.toLowerCase();
  for (const [pattern, signals] of Object.entries(FILE_PATH_SIGNALS)) {
    if (lowerPrompt.includes(pattern.toLowerCase())) {
      for (const { role, bonus } of signals) {
        bonuses[role] = (bonuses[role] || 0) + bonus;
      }
    }
  }
  return bonuses;
}

function formatPersona(agent: AgentDefinition): string {
  const lines: string[] = ['<AGENTCROW_PERSONA>'];

  lines.push(`You are ${agent.name} — ${agent.description}`);
  lines.push('');

  if (agent.identity.personality) {
    lines.push('## Identity');
    lines.push(agent.identity.personality);
    lines.push('');
  }

  if (agent.identity.communication) {
    lines.push('## Communication Style');
    lines.push(agent.identity.communication);
    lines.push('');
  }

  if (agent.identity.thinking) {
    lines.push('## Thinking Approach');
    lines.push(agent.identity.thinking);
    lines.push('');
  }

  if (agent.critical_rules.must.length > 0) {
    lines.push('## MUST');
    for (const rule of agent.critical_rules.must) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  if (agent.critical_rules.must_not.length > 0) {
    lines.push('## MUST NOT');
    for (const rule of agent.critical_rules.must_not) {
      lines.push(`- ${rule}`);
    }
    lines.push('');
  }

  if (agent.deliverables.length > 0) {
    lines.push('## Deliverables');
    for (const d of agent.deliverables) {
      lines.push(`- ${d}`);
    }
    lines.push('');
  }

  if (agent.output_format && Object.keys(agent.output_format).length > 0) {
    lines.push('## Output Format');
    for (const [key, value] of Object.entries(agent.output_format)) {
      lines.push(`- **${key}**: ${value}`);
    }
    lines.push('');
  }

  if (agent.example) {
    lines.push('## Example');
    if (agent.example.bad) {
      lines.push('BAD:');
      lines.push('```');
      lines.push(agent.example.bad.trim());
      lines.push('```');
    }
    if (agent.example.good) {
      lines.push('GOOD:');
      lines.push('```');
      lines.push(agent.example.good.trim());
      lines.push('```');
    }
    lines.push('');
  }

  lines.push('</AGENTCROW_PERSONA>');
  return lines.join('\n');
}

export async function cmdInject(): Promise<void> {
  // Read hook input from stdin
  let rawInput = '';
  try {
    rawInput = fs.readFileSync('/dev/stdin', 'utf-8');
  } catch {
    return; // No stdin, exit silently
  }

  let hookInput: {
    tool_name?: string;
    tool_input?: {
      prompt?: string;
      name?: string;
      subagent_type?: string;
      description?: string;
      model?: string;
    };
  };

  try {
    hookInput = JSON.parse(rawInput);
  } catch {
    return; // Invalid JSON, passthrough
  }

  // Only process Agent tool calls
  if (hookInput.tool_name !== 'Agent') return;

  const toolInput = hookInput.tool_input;
  if (!toolInput?.prompt) return;

  // Skip Claude Code built-in subagent types (unless name explicitly matches an agent)
  if (toolInput.subagent_type && BUILTIN_SUBAGENT_TYPES.has(toolInput.subagent_type) && !toolInput.name) {
    return;
  }

  // Load pre-built catalog index
  const index = loadCatalogIndex();
  if (!index) return;

  let matchedAgent: AgentDefinition | null = null;
  let matchType: 'exact' | 'fuzzy' | 'none' = 'none';

  // Strategy 1: Exact match by name
  if (toolInput.name) {
    const normalized = toolInput.name.toLowerCase().replace(/[-\s]/g, '_');
    if (index.agents[normalized]) {
      matchedAgent = index.agents[normalized];
      matchType = 'exact';
    }
  }

  // Strategy 2: Exact match by subagent_type (if it looks like a role name)
  if (!matchedAgent && toolInput.subagent_type && !BUILTIN_SUBAGENT_TYPES.has(toolInput.subagent_type)) {
    const normalized = toolInput.subagent_type.toLowerCase().replace(/[-\s]/g, '_');
    if (index.agents[normalized]) {
      matchedAgent = index.agents[normalized];
      matchType = 'exact';
    }
  }

  // Strategy 3: Keyword matching — ONLY against agents with usage history (active agents)
  // Exact match (Strategy 1, 2) still works against all 154 agents.
  // Fuzzy match is restricted to agents the user actually uses → fewer candidates → higher accuracy.
  if (!matchedAgent) {
    const searchText = [toolInput.prompt, toolInput.description ?? '', toolInput.name ?? ''].join(' ');
    const keywords = extractKeywords(searchText);

    // File path signal bonus — strongest signal for matching
    const filePathBonuses = getFilePathBonus(toolInput.prompt ?? '');

    // Build history frequency map + active agent set
    const historyBonus: Record<string, number> = {};
    const activeRoles = new Set<string>();
    try {
      const history = loadHistory();
      for (const record of history) {
        if (record.matchType !== 'none' && record.role) {
          historyBonus[record.role] = (historyBonus[record.role] || 0) + 1;
          activeRoles.add(record.role);
        }
      }
    } catch {
      // history unavailable — fall back to all agents
    }

    // Always include builtin agents in active set
    for (const entry of index.entries) {
      if (entry.source.type === 'builtin') {
        activeRoles.add(entry.role);
      }
    }

    if (keywords.length > 0 || Object.keys(filePathBonuses).length > 0) {
      let bestScore = 0;
      let bestRole = '';

      for (const entry of index.entries) {
        // Fuzzy matching only against active agents (used before or builtin)
        if (activeRoles.size > 0 && !activeRoles.has(entry.role)) continue;

        let score = 0;

        // File path signal bonus (highest weight — direct evidence)
        if (filePathBonuses[entry.role]) {
          score += filePathBonuses[entry.role];
        }

        for (const kw of keywords) {
          // Tag match
          if (entry.tags.some((t) => t.toLowerCase() === kw)) score += 2;
          else if (entry.tags.some((t) => t.toLowerCase().startsWith(kw) && kw.length >= 3)) score += 1;

          // Role match
          if (entry.role.toLowerCase().includes(kw)) score += 3;
          // Name match
          if (entry.name.toLowerCase().includes(kw)) score += 2;
          // Description match
          if (entry.description.toLowerCase().includes(kw)) score += 1;
        }

        // Builtin bonus
        if (score > 0 && entry.source.type === 'builtin') score += 0.5;

        // History learning bonus
        if (score > 0 && historyBonus[entry.role]) {
          const freq = historyBonus[entry.role];
          score += Math.min(freq * 0.5, 3);
        }

        if (score > bestScore) {
          bestScore = score;
          bestRole = entry.role;
        }
      }

      // Threshold 7 — prefer passthrough over wrong persona
      if (bestScore >= 7 && index.agents[bestRole]) {
        matchedAgent = index.agents[bestRole];
        matchType = 'fuzzy';
      }
    }
  }

  // No match — passthrough (output nothing, exit 0)
  if (!matchedAgent) {
    recordDispatch({
      timestamp: new Date().toISOString(),
      role: toolInput.name ?? 'unknown',
      action: (toolInput.prompt ?? '').slice(0, 100),
      matchType: 'none',
      agentName: null,
      source: 'hook',
    });
    return;
  }

  // Format persona and prepend to original prompt
  const persona = formatPersona(matchedAgent);
  const enhancedPrompt = `${persona}\n\n${toolInput.prompt}`;

  // Auto-select model based on agent role + prompt complexity
  const selectedModel = selectModel(matchedAgent, toolInput.prompt ?? '');

  // Record dispatch
  recordDispatch({
    timestamp: new Date().toISOString(),
    role: matchedAgent.role,
    action: (toolInput.prompt ?? '').slice(0, 100),
    matchType,
    agentName: matchedAgent.name,
    source: 'hook',
  });

  // Output hook response with updatedInput (persona + model)
  const updatedInput: Record<string, unknown> = {
    ...toolInput,
    prompt: enhancedPrompt,
  };

  // Only set model if not already specified by the caller
  if (!toolInput.model) {
    updatedInput['model'] = selectedModel;
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput,
    },
  };

  process.stdout.write(JSON.stringify(output));
}
