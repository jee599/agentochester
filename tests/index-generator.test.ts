import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CatalogEntry } from '../src/core/types.js';

describe('index-generator', () => {
  const srcPath = path.resolve('src/utils/index-generator.ts');

  it('index-generator.ts가 존재한다', () => {
    expect(fs.existsSync(srcPath)).toBe(true);
  });

  it('generateAgentIndex를 export한다', () => {
    const content = fs.readFileSync(srcPath, 'utf-8');
    expect(content).toContain('export function generateAgentIndex');
  });

  it('division별로 그룹화한다', () => {
    const content = fs.readFileSync(srcPath, 'utf-8');
    expect(content).toContain('grouped');
    expect(content).toContain('division');
  });

  it('마크다운 테이블 형식으로 출력한다', () => {
    const content = fs.readFileSync(srcPath, 'utf-8');
    expect(content).toContain('| Role | Name | Description |');
  });
});

describe('index-generator integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentcrow-idx-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('INDEX.md를 생성한다', async () => {
    const { generateAgentIndex } = await import('../src/utils/index-generator.js');

    const mockAgents: CatalogEntry[] = [
      {
        name: 'QA Engineer',
        role: 'qa_engineer',
        description: 'Test specialist',
        tags: ['test', 'qa'],
        division: 'builtin',
        source: { type: 'builtin', filePath: '/tmp/qa.yaml' },
        filePath: '/tmp/qa.yaml',
      },
      {
        name: 'Frontend Developer',
        role: 'frontend_developer',
        description: 'React and UI specialist',
        tags: ['frontend', 'react'],
        division: 'engineering',
        source: { type: 'external', repo: 'agency-agents', filePath: '/tmp/fe.md', division: 'engineering' },
        filePath: '/tmp/fe.md',
      },
    ];

    generateAgentIndex(mockAgents, tmpDir);

    const indexPath = path.join(tmpDir, 'INDEX.md');
    expect(fs.existsSync(indexPath)).toBe(true);

    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('# Agent Index');
    expect(content).toContain('2 agents across 2 divisions');
    expect(content).toContain('qa_engineer');
    expect(content).toContain('frontend_developer');
    expect(content).toContain('## builtin');
    expect(content).toContain('## engineering');
    expect(content).toContain('[qa_engineer](qa_engineer.md)');
  });
});
