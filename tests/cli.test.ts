import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('cli module', () => {
  const cliSrcPath = path.resolve('src/cli.ts');
  const cliDistPath = path.resolve('dist/cli.js');

  it('src/cli.ts 파일이 존재한다', () => {
    expect(fs.existsSync(cliSrcPath)).toBe(true);
  });

  it('cli.ts에 필수 import가 포함되어 있다', () => {
    const content = fs.readFileSync(cliSrcPath, 'utf-8');
    expect(content).toContain("import { AgentCatalog }");
    expect(content).toContain("import { AgentManager }");
  });

  it('cli.ts에 모든 서브커맨드가 정의되어 있다', () => {
    const content = fs.readFileSync(cliSrcPath, 'utf-8');
    const expectedCommands = ['init', 'on', 'off', 'status', 'agents', 'compose'];
    for (const cmd of expectedCommands) {
      expect(content).toContain(`'${cmd}'`);
    }
  });

  it('package.json bin이 dist/cli.js를 가리킨다', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
    expect(pkg.bin.agentcrow).toBe('./dist/cli.js');
  });

  it('cli.ts에 shebang이 포함되어 있다', () => {
    const content = fs.readFileSync(cliSrcPath, 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });
});
