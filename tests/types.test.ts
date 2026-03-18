import { describe, it, expect } from 'vitest';
import type { AgentSource, AgentDefinition, CatalogEntry } from '../src/core/types';

describe('types', () => {
  it('AgentDefinition을 올바르게 구성할 수 있다', () => {
    const agent: AgentDefinition = {
      name: 'Test Agent',
      role: 'test_agent',
      description: 'Test description',
      identity: {
        personality: 'Test personality',
        communication: 'Direct',
        thinking: 'Analytical',
      },
      critical_rules: {
        must: ['Rule 1'],
        must_not: ['Anti-rule 1'],
      },
      deliverables: ['Deliverable 1'],
      success_metrics: ['Metric 1'],
      source: { type: 'builtin', filePath: '/path/to/file.yaml' },
      tags: ['test'],
    };

    expect(agent.name).toBe('Test Agent');
    expect(agent.source.type).toBe('builtin');
    expect(agent.tags).toContain('test');
  });

  it('AgentSource external 타입이 division을 포함한다', () => {
    const source: AgentSource = {
      type: 'external',
      repo: 'agency-agents',
      filePath: '/path/to/file.md',
      division: 'engineering',
    };
    expect(source.type).toBe('external');
    expect(source.division).toBe('engineering');
  });

  it('CatalogEntry를 올바르게 구성할 수 있다', () => {
    const entry: CatalogEntry = {
      name: 'Frontend Developer',
      role: 'frontend_developer',
      description: 'Builds UIs',
      tags: ['frontend', 'react'],
      division: 'engineering',
      source: { type: 'external', repo: 'agency-agents', filePath: '/path', division: 'engineering' },
      filePath: '/path/to/file.md',
    };
    expect(entry.role).toBe('frontend_developer');
  });
});
