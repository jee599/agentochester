import { describe, it, expect } from 'vitest';
import { assembleAgentPrompt, assembleTeamPrompt } from '../src/core/assembler';
import type { AgentDefinition, Task } from '../src/core/types';

function mockAgent(overrides: Partial<AgentDefinition> = {}): AgentDefinition {
  return {
    name: 'Test Agent',
    role: 'test_agent',
    description: 'A test agent for unit tests',
    identity: {
      personality: 'Precise and methodical',
      communication: 'Direct and clear',
      thinking: 'Analytical',
    },
    critical_rules: {
      must: ['Follow the spec', 'Write tests'],
      must_not: ['Skip validation', 'Ignore errors'],
    },
    deliverables: ['Clean code', 'Test report'],
    success_metrics: ['100% test pass', 'No lint errors'],
    source: { type: 'builtin', filePath: 'agents/builtin/test.yaml' },
    tags: ['test', 'qa'],
    ...overrides,
  };
}

function mockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    role: 'test_agent',
    action: 'Implement the feature',
    depends_on: [],
    ...overrides,
  };
}

describe('assembleAgentPrompt', () => {
  it('모든 섹션이 포함된 프롬프트를 생성한다', () => {
    const agent = mockAgent();
    const prompt = assembleAgentPrompt(agent, 'Do the thing');

    expect(prompt).toContain('# Test Agent');
    expect(prompt).toContain('> A test agent for unit tests');
    expect(prompt).toContain('[Identity]');
    expect(prompt).toContain('Personality: Precise and methodical');
    expect(prompt).toContain('Communication: Direct and clear');
    expect(prompt).toContain('Thinking: Analytical');
    expect(prompt).toContain('[MUST]');
    expect(prompt).toContain('- Follow the spec');
    expect(prompt).toContain('- Write tests');
    expect(prompt).toContain('[MUST NOT]');
    expect(prompt).toContain('- Skip validation');
    expect(prompt).toContain('- Ignore errors');
    expect(prompt).toContain('[Deliverables]');
    expect(prompt).toContain('- Clean code');
    expect(prompt).toContain('[Success Metrics]');
    expect(prompt).toContain('- 100% test pass');
    expect(prompt).toContain('[Task]');
    expect(prompt).toContain('Do the thing');
  });

  it('source type이 달라도 동일한 프롬프트 구조를 생성한다', () => {
    const builtinAgent = mockAgent({
      source: { type: 'builtin', filePath: 'agents/builtin/test.yaml' },
    });
    const externalAgent = mockAgent({
      source: { type: 'external', repo: 'agency-agents', filePath: 'agents/ext/test.yaml', division: 'eng' },
    });

    const builtinPrompt = assembleAgentPrompt(builtinAgent, 'Same action');
    const externalPrompt = assembleAgentPrompt(externalAgent, 'Same action');

    expect(builtinPrompt).toBe(externalPrompt);
  });
});

describe('assembleTeamPrompt', () => {
  it('여러 에이전트를 하나의 팀 프롬프트로 합친다', () => {
    const tasks = [
      {
        agent: mockAgent({ name: 'Agent A', role: 'agent_a' }),
        task: mockTask({ id: 'task-a', action: 'Build frontend', depends_on: [], file_scope: ['src/ui'] }),
      },
      {
        agent: mockAgent({ name: 'Agent B', role: 'agent_b' }),
        task: mockTask({ id: 'task-b', action: 'Build backend', depends_on: ['task-a'] }),
      },
    ];

    const result = assembleTeamPrompt(tasks, 'E-commerce platform');

    expect(result.prompt).toContain('# Project Context');
    expect(result.prompt).toContain('E-commerce platform');
    expect(result.prompt).toContain('# Agent A');
    expect(result.prompt).toContain('Build frontend');
    expect(result.prompt).toContain('File Scope: src/ui');
    expect(result.prompt).toContain('# Agent B');
    expect(result.prompt).toContain('Build backend');
    expect(result.prompt).toContain('Dependencies: task-a');
  });

  it('agentCount와 tokenEstimate가 정확하다', () => {
    const tasks = [
      { agent: mockAgent(), task: mockTask() },
      { agent: mockAgent({ name: 'Agent 2' }), task: mockTask({ id: 'task-2' }) },
      { agent: mockAgent({ name: 'Agent 3' }), task: mockTask({ id: 'task-3' }) },
    ];

    const result = assembleTeamPrompt(tasks, 'Test project');

    expect(result.agentCount).toBe(3);
    expect(result.tokenEstimate).toBe(Math.ceil(result.prompt.length / 4));
  });
});
