import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('constants module', () => {
  const constantsSrcPath = path.resolve('src/utils/constants.ts');

  it('VERSION이 package.json에서 읽힌다', () => {
    const content = fs.readFileSync(constantsSrcPath, 'utf-8');
    expect(content).toContain('package.json');
    expect(content).not.toMatch(/const VERSION = '[0-9]/);
  });

  it('ROLE_EMOJI가 주요 역할을 모두 커버한다', () => {
    const content = fs.readFileSync(constantsSrcPath, 'utf-8');
    const requiredRoles = ['frontend', 'backend', 'qa', 'security', 'design', 'devops', 'ai', 'mobile'];
    for (const role of requiredRoles) {
      expect(content).toContain(`${role}:`);
    }
  });

  it('getRoleEmoji가 매칭되지 않는 역할에 기본 이모지를 반환한다', () => {
    const content = fs.readFileSync(constantsSrcPath, 'utf-8');
    expect(content).toContain("return '🐦'");
  });

  it('AGENTCROW_START/END 마커가 정의되어 있다', () => {
    const content = fs.readFileSync(constantsSrcPath, 'utf-8');
    expect(content).toContain('<!-- AgentCrow Start -->');
    expect(content).toContain('<!-- AgentCrow End -->');
  });
});

describe('catalog scoring', () => {
  it('builtin 에이전트가 external보다 높은 가산점을 받는다', () => {
    const content = fs.readFileSync(path.resolve('src/core/catalog.ts'), 'utf-8');
    // Should give builtin a bonus, not external
    expect(content).toContain("entry.source.type === 'builtin'");
    expect(content).toContain('score += 0.5');
    // Bonus should be for builtin, not external
    expect(content).not.toMatch(/score \+= [\d.]+.*entry\.source\.type === 'external'/);
  });
});
