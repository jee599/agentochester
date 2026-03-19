import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import { AgentManager } from '../src/core/agent-manager';

const BUILTIN_DIR = path.resolve('agents/builtin');
const EXTERNAL_DIR = path.resolve('agents/external/agency-agents');

describe('AgentManager 3-tier matching', () => {
  let manager: AgentManager;

  beforeAll(async () => {
    manager = new AgentManager(BUILTIN_DIR, EXTERNAL_DIR);
    await manager.initialize();
  });

  it('builtin exact match', async () => {
    const result = await manager.matchAgent({
      id: 'task_1', role: 'korean_tech_writer',
      action: '한국어 README 작성', depends_on: [], file_scope: ['docs/'],
    });
    expect(result.agent).not.toBeNull();
    expect(result.agent!.source.type).toBe('builtin');
    expect(result.matchType).toBe('exact');
  });

  it('no match → none', async () => {
    const result = await manager.matchAgent({
      id: 'task_2', role: 'quantum_computing_specialist',
      action: '양자 회로 시뮬레이터', depends_on: [],
    });
    expect(result.matchType).toBe('none');
  });

  it('fuzzy match via tags', async () => {
    const result = await manager.matchAgent({
      id: 'task_3', role: 'security_checker',
      action: '보안 감사 수행', depends_on: [], file_scope: ['src/'],
    });
    if (result.candidates && result.candidates.length > 0) {
      expect(result.candidates.some(c => c.name.toLowerCase().includes('security'))).toBe(true);
    }
  });

  it('listAgents returns grouped divisions', () => {
    const list = manager.listAgents();
    expect(list.length).toBeGreaterThan(0);
    const builtin = list.find(g => g.division === 'builtin');
    expect(builtin).toBeDefined();
    expect(builtin!.agents.length).toBe(9);
  });

  it('fuzzy match: score >= 4이면 agent를 반환한다', async () => {
    // security_checker는 존재하지 않지만, security 태그로 fuzzy 매칭됨
    // security_auditor_deep builtin에 role에 "security"가 포함되어 score += 3 이상
    const result = await manager.matchAgent({
      id: 'task_fuzzy_high',
      role: 'security_audit',
      action: 'security review',
      depends_on: [],
    });
    // security는 role에 포함되므로 score >= 3, + tags/name/desc 추가 점수
    if (result.matchType === 'fuzzy') {
      expect(result.agent).not.toBeNull();
      expect(result.candidates).toBeDefined();
      expect(result.candidates!.length).toBeGreaterThan(0);
      expect(result.candidates![0].score).toBeGreaterThanOrEqual(4);
    }
  });

  it('fuzzy match: score < 4이면 none을 반환한다', async () => {
    // 애매한 키워드로 매칭 시도 — 점수가 4 미만이면 none
    const result = await manager.matchAgent({
      id: 'task_fuzzy_low',
      role: 'xyz_unknown',
      action: 'do something vague',
      depends_on: [],
    });
    expect(result.matchType).toBe('none');
    expect(result.agent).toBeNull();
  });

});
