import type { AgentDefinition, Task } from './types.js';

export interface TaskWithAgent {
  agent: AgentDefinition;
  task: Task;
}

export interface AssemblyResult {
  prompt: string;
  agentCount: number;
  tokenEstimate: number;
}

export function assembleAgentPrompt(agent: AgentDefinition, taskAction: string): string {
  const sections: string[] = [];

  sections.push(`# ${agent.name}`);
  sections.push(`> ${agent.description}`);

  sections.push('');
  sections.push('[Identity]');
  sections.push(`- Personality: ${agent.identity.personality}`);
  sections.push(`- Communication: ${agent.identity.communication}`);
  sections.push(`- Thinking: ${agent.identity.thinking}`);

  sections.push('');
  sections.push('[MUST]');
  for (const rule of agent.critical_rules.must) {
    sections.push(`- ${rule}`);
  }

  sections.push('');
  sections.push('[MUST NOT]');
  for (const rule of agent.critical_rules.must_not) {
    sections.push(`- ${rule}`);
  }

  sections.push('');
  sections.push('[Deliverables]');
  for (const d of agent.deliverables) {
    sections.push(`- ${d}`);
  }

  sections.push('');
  sections.push('[Success Metrics]');
  for (const m of agent.success_metrics) {
    sections.push(`- ${m}`);
  }

  sections.push('');
  sections.push('[Task]');
  sections.push(taskAction);

  return sections.join('\n');
}

export function assembleTeamPrompt(tasks: TaskWithAgent[], projectContext: string): AssemblyResult {
  const sections: string[] = [];

  sections.push('# Project Context');
  sections.push(projectContext);

  for (const { agent, task } of tasks) {
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push(assembleAgentPrompt(agent, task.action));

    if (task.depends_on.length > 0) {
      sections.push('');
      sections.push(`Dependencies: ${task.depends_on.join(', ')}`);
    }

    if (task.file_scope && task.file_scope.length > 0) {
      sections.push('');
      sections.push(`File Scope: ${task.file_scope.join(', ')}`);
    }
  }

  const prompt = sections.join('\n');

  return {
    prompt,
    agentCount: tasks.length,
    tokenEstimate: Math.ceil(prompt.length / 4),
  };
}
