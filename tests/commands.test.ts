import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('update command', () => {
  const updatePath = path.resolve('src/commands/update.ts');

  it('update.ts가 존재한다', () => {
    expect(fs.existsSync(updatePath)).toBe(true);
  });

  it('git clone으로 external agents를 업데이트한다', () => {
    const content = fs.readFileSync(updatePath, 'utf-8');
    expect(content).toContain('git');
    expect(content).toContain('clone');
    expect(content).toContain('agency-agents');
  });

  it('temp 디렉토리를 사용해 안전하게 교체한다', () => {
    const content = fs.readFileSync(updatePath, 'utf-8');
    expect(content).toContain('.tmp');
    expect(content).toContain('renameSync');
  });

  it('.md 파일을 재생성한다', () => {
    const content = fs.readFileSync(updatePath, 'utf-8');
    expect(content).toContain('regenerated');
  });
});

describe('doctor command', () => {
  const doctorPath = path.resolve('src/commands/doctor.ts');

  it('doctor.ts가 존재한다', () => {
    expect(fs.existsSync(doctorPath)).toBe(true);
  });

  it('Node.js, git, claude CLI를 체크한다', () => {
    const content = fs.readFileSync(doctorPath, 'utf-8');
    expect(content).toContain('Node.js');
    expect(content).toContain('git');
    expect(content).toContain('claude CLI');
  });

  it('global storage와 symlink를 체크한다', () => {
    const content = fs.readFileSync(doctorPath, 'utf-8');
    expect(content).toContain('Global storage');
    expect(content).toContain('symlink');
  });

  it('settings hook을 체크한다', () => {
    const content = fs.readFileSync(doctorPath, 'utf-8');
    expect(content).toContain('SessionStart hook');
  });
});

describe('uninstall command', () => {
  const uninstallPath = path.resolve('src/commands/uninstall.ts');

  it('uninstall.ts가 존재한다', () => {
    expect(fs.existsSync(uninstallPath)).toBe(true);
  });

  it('~/.agentcrow를 제거한다', () => {
    const content = fs.readFileSync(uninstallPath, 'utf-8');
    expect(content).toContain('.agentcrow');
    expect(content).toContain('rmSync');
  });

  it('CLAUDE.md에서 AgentCrow 섹션만 제거한다', () => {
    const content = fs.readFileSync(uninstallPath, 'utf-8');
    expect(content).toContain('AGENTCROW_START');
    expect(content).toContain('AGENTCROW_END');
  });

  it('project와 global 모두 정리한다', () => {
    const content = fs.readFileSync(uninstallPath, 'utf-8');
    expect(content).toContain("label: 'project'");
    expect(content).toContain("label: 'global'");
  });

  it('npm 패키지 제거 안내를 보여준다', () => {
    const content = fs.readFileSync(uninstallPath, 'utf-8');
    expect(content).toContain('npm uninstall -g agentcrow');
  });
});

describe('compose command', () => {
  const composePath = path.resolve('src/commands/compose.ts');

  it('compose.ts가 존재한다', () => {
    expect(fs.existsSync(composePath)).toBe(true);
  });

  it('claude CLI 사전 체크를 수행한다', () => {
    const content = fs.readFileSync(composePath, 'utf-8');
    expect(content).toContain('checkClaudeCli');
    expect(content).toContain('which claude');
  });

  it('verbose 모드를 지원한다', () => {
    const content = fs.readFileSync(composePath, 'utf-8');
    expect(content).toContain('verbose');
    expect(content).toContain('[verbose]');
  });

  it('구체적인 에러 메시지를 제공한다', () => {
    const content = fs.readFileSync(composePath, 'utf-8');
    expect(content).toContain('Failed to decompose prompt');
    expect(content).toContain('Failed to parse decomposition result');
    expect(content).toContain('Failed to spawn claude process');
  });
});

describe('init command --lang', () => {
  const initPath = path.resolve('src/commands/init.ts');

  it('한국어 템플릿을 지원한다', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain("isKo");
    expect(content).toContain('규칙');
    expect(content).toContain('에이전트');
  });

  it('영어가 기본 언어다', () => {
    const content = fs.readFileSync(initPath, 'utf-8');
    expect(content).toContain("lang: string = 'en'");
  });
});
