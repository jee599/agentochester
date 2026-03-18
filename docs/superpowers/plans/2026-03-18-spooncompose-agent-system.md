# SpoonCompose Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** agency-agents 서브모듈 + builtin 커스텀 8개 + 자동 생성의 3-tier 에이전트 매칭 시스템을 구현한다.

**Architecture:** agency-agents(.md) → adapter.ts가 AgentDefinition으로 변환 → catalog.ts가 인덱싱 → agent-manager.ts가 3-tier(external→builtin→generated) 매칭. builtin은 YAML, external은 .md 이중 포맷.

**Tech Stack:** TypeScript, Node.js, Vitest, yaml (npm), git submodule

---

## File Structure

```
spoon-compose/
├── src/
│   └── core/
│       ├── types.ts           — AgentDefinition, AgentSource, CatalogEntry 타입
│       ├── adapter.ts         — .md → AgentDefinition 변환 파서
│       ├── catalog.ts         — 에이전트 카탈로그 (빌드, 검색, 매칭)
│       └── agent-manager.ts   — 3-tier 매칭 로직
├── agents/
│   └── builtin/               — 커스텀 YAML 에이전트 8개
│       ├── korean-tech-writer.yaml
│       ├── unreal-gas-specialist.yaml
│       ├── compose-meta-reviewer.yaml
│       ├── translator.yaml
│       ├── data-pipeline-engineer.yaml
│       ├── refactoring-specialist.yaml
│       ├── security-auditor-deep.yaml
│       └── complexity-critic.yaml
├── tests/
│   ├── adapter.test.ts
│   ├── builtin.test.ts
│   ├── catalog.test.ts
│   └── agent-manager.test.ts
├── config.yaml
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── .gitmodules
```

### Scope

이 플랜은 코어 로직(types, adapter, catalog, agent-manager)과 builtin 에이전트를 다룬다.
명세서 섹션 9(assembler.ts 연동), 10(대시보드 변경), 11(config.yaml 런타임 로드)은 별도 플랜에서 처리한다.

---

### Task 1: 프로젝트 초기화 + TypeScript 셋업

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: package.json 생성**

```json
{
  "name": "spoon-compose",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "agents:init": "git submodule update --init --recursive",
    "agents:update": "git submodule update --remote agents/external/agency-agents",
    "agents:catalog": "npx tsx src/core/catalog.ts --rebuild",
    "postinstall": "git submodule update --init --recursive || true"
  }
}
```

- [ ] **Step 2: tsconfig.json 생성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "declaration": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: .gitignore 생성**

```
node_modules/
dist/
*.js.map
.env
```

- [ ] **Step 4: 의존성 설치**

Run: `cd /Users/jidong/agentochester && npm install yaml vitest typescript @types/node --save-dev`
Expected: `node_modules` 생성, `package-lock.json` 생성

- [ ] **Step 5: git submodule 추가**

Run: `cd /Users/jidong/agentochester && git submodule add https://github.com/msitarzewski/agency-agents.git agents/external/agency-agents`
Expected: `.gitmodules` 생성, `agents/external/agency-agents/` 에 md 파일들 다운로드

- [ ] **Step 6: 커밋**

```bash
cd /Users/jidong/agentochester
git add package.json package-lock.json tsconfig.json .gitignore .gitmodules agents/external/agency-agents
git commit -m "chore: init project with TypeScript, Vitest, agency-agents submodule"
```

---

### Task 2: types.ts — 핵심 타입 정의

**Files:**
- Create: `src/core/types.ts`
- Test: `tests/types.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/types.test.ts
import { describe, it, expect } from 'vitest';
import type { AgentSource, AgentDefinition, CatalogEntry, AgentIdentity, AgentCriticalRules } from '../src/core/types';

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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/types.test.ts`
Expected: FAIL — `../src/core/types` 모듈을 찾을 수 없음

- [ ] **Step 3: types.ts 구현**

```typescript
// src/core/types.ts

export type AgentSource =
  | { type: 'external'; repo: 'agency-agents'; filePath: string; division: string }
  | { type: 'builtin'; filePath: string }
  | { type: 'generated'; prompt: string; timestamp: string };

export interface AgentIdentity {
  personality: string;
  communication: string;
  thinking: string;
}

export interface AgentCriticalRules {
  must: string[];
  must_not: string[];
}

export interface AgentDefinition {
  name: string;
  role: string;
  description: string;
  identity: AgentIdentity;
  critical_rules: AgentCriticalRules;
  deliverables: string[];
  success_metrics: string[];
  source: AgentSource;
  tags: string[];
  division?: string;
  confidence?: number;
}

export interface CatalogEntry {
  name: string;
  role: string;
  description: string;
  tags: string[];
  division: string;
  source: AgentSource;
  filePath: string;
}

export interface Task {
  id: string;
  role: string;
  action: string;
  depends_on: string[];
  file_scope?: string[];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/types.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/core/types.ts tests/types.test.ts
git commit -m "feat: add core type definitions (AgentDefinition, AgentSource, CatalogEntry)"
```

---

### Task 3: adapter.ts — .md 파서 (유틸리티 함수)

adapter.ts가 가장 핵심이고 복잡하다. 내부 유틸리티 함수부터 구현한다.

**Files:**
- Create: `src/core/adapter.ts`
- Test: `tests/adapter.test.ts`

- [ ] **Step 1: 유틸리티 함수 테스트 작성**

```typescript
// tests/adapter.test.ts
import { describe, it, expect } from 'vitest';
import {
  splitIntoSections,
  extractName,
  inferRoleFromFileName,
  extractBulletItems,
  extractBoldField,
} from '../src/core/adapter';

describe('adapter utilities', () => {
  describe('splitIntoSections', () => {
    it('## 헤딩으로 섹션을 분리한다', () => {
      const md = `# Title\nIntro\n## Section A\nContent A\n## Section B\nContent B`;
      const sections = splitIntoSections(md);
      expect(sections).toHaveLength(2);
      expect(sections[0].heading).toBe('Section A');
      expect(sections[0].level).toBe(2);
      expect(sections[0].content).toBe('Content A');
      expect(sections[1].heading).toBe('Section B');
    });

    it('### 헤딩도 분리한다', () => {
      const md = `## Parent\nP content\n### Child\nC content`;
      const sections = splitIntoSections(md);
      expect(sections).toHaveLength(2);
      expect(sections[1].level).toBe(3);
    });

    it('이모지를 제거한다', () => {
      const md = `## 🎨 Identity & Memory\nContent`;
      const sections = splitIntoSections(md);
      expect(sections[0].heading).toBe('Identity & Memory');
    });
  });

  describe('extractName', () => {
    it('H1에서 이름을 추출한다', () => {
      expect(extractName('# 🎨 Frontend Developer\n\nSome content')).toBe('Frontend Developer');
    });

    it('H1이 없으면 에러를 던진다', () => {
      expect(() => extractName('No heading here')).toThrow('No H1 title found');
    });
  });

  describe('inferRoleFromFileName', () => {
    it('디비전 접두사를 제거하고 snake_case로 변환한다', () => {
      expect(inferRoleFromFileName('/path/engineering-frontend-developer.md')).toBe('frontend_developer');
    });

    it('디비전 접두사가 없으면 그대로 변환한다', () => {
      expect(inferRoleFromFileName('/path/game-designer.md')).toBe('game_designer');
    });
  });

  describe('extractBulletItems', () => {
    it('불릿 아이템을 추출한다', () => {
      const content = '- Item one here\n- Item two here\n* Item three here';
      const items = extractBulletItems(content);
      expect(items).toHaveLength(3);
      expect(items[0]).toBe('Item one here');
    });

    it('5자 미만 아이템을 필터링한다', () => {
      const content = '- OK\n- This is valid item';
      const items = extractBulletItems(content);
      expect(items).toHaveLength(1);
    });
  });

  describe('extractBoldField', () => {
    it('**Label**: Value 패턴을 추출한다', () => {
      const content = '**Personality**: Detail-oriented developer\n**Communication**: Direct';
      expect(extractBoldField(content, ['Personality'])).toBe('Detail-oriented developer');
    });

    it('매칭 없으면 빈 문자열 반환', () => {
      expect(extractBoldField('No bold here', ['Missing'])).toBe('');
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: adapter.ts 유틸리티 함수 구현**

```typescript
// src/core/adapter.ts
import * as fs from 'fs';
import * as path from 'path';
import type { AgentDefinition, AgentIdentity, AgentCriticalRules } from './types';

export interface Section {
  heading: string;
  level: number;
  content: string;
}

const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

export function splitIntoSections(content: string): Section[] {
  const lines = content.split('\n');
  const sections: Section[] = [];
  let current: Section | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = !h2Match ? line.match(/^###\s+(.+)/) : null;

    if (h2Match || h3Match) {
      if (current) {
        current.content = buffer.join('\n').trim();
        sections.push(current);
      }
      const raw = h2Match ? h2Match[1] : h3Match![1];
      current = {
        heading: raw.replace(EMOJI_REGEX, '').trim(),
        level: h2Match ? 2 : 3,
        content: '',
      };
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (current) {
    current.content = buffer.join('\n').trim();
    sections.push(current);
  }

  return sections;
}

export function extractName(content: string): string {
  const match = content.match(/^#\s+(.+)/m);
  if (!match) throw new Error('No H1 title found');
  return match[1].replace(EMOJI_REGEX, '').trim();
}

const DIVISION_PREFIXES = [
  'engineering-', 'design-', 'marketing-', 'product-', 'testing-',
  'support-', 'sales-', 'paid-media-', 'project-management-',
  'specialized-',
];

export function inferRoleFromFileName(filePath: string): string {
  const basename = path.basename(filePath, '.md');
  let role = basename;
  for (const prefix of DIVISION_PREFIXES) {
    if (role.startsWith(prefix)) {
      role = role.slice(prefix.length);
      break;
    }
  }
  return role.replace(/-/g, '_');
}

export function extractBulletItems(content: string): string[] {
  const matches = content.match(/^[-*]\s+(.+)/gm);
  if (!matches) return [];
  return matches
    .map(m => m.replace(/^[-*]\s+/, '').trim())
    .filter(m => m.length > 5 && m.length < 500);
}

export function extractBoldField(content: string, labels: string[]): string {
  for (const label of labels) {
    const regex = new RegExp(`\\*\\*${label}\\*\\*[:\\s]*(.+?)(?=\\n\\*\\*|\\n\\n|$)`, 'is');
    const match = content.match(regex);
    if (match) return match[1].trim();
  }
  return '';
}

export function findSection(sections: Section[], candidates: string[]): Section | null {
  for (const candidate of candidates) {
    const found = sections.find(s =>
      s.heading.toLowerCase().includes(candidate.toLowerCase())
    );
    if (found) return found;
  }
  return null;
}

function findMdFilesRecursive(dirPath: string): string[] {
  const EXCLUDED_FILES = ['README.md', 'CONTRIBUTING.md', 'LICENSE', 'CHANGELOG.md'];
  const results: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.name.endsWith('.md') &&
        !EXCLUDED_FILES.includes(entry.name)
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(dirPath);
  return results;
}
```

(extractIdentity, extractCriticalRules 등 고수준 함수는 Task 4에서 추가)

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: PASS (모든 유틸리티 테스트)

- [ ] **Step 5: 커밋**

```bash
git add src/core/adapter.ts tests/adapter.test.ts
git commit -m "feat: add adapter.ts utility functions (section parsing, name/role extraction)"
```

---

### Task 4: adapter.ts — 고수준 파싱 함수 (parseAgencyAgentMd)

**Files:**
- Modify: `src/core/adapter.ts`
- Modify: `tests/adapter.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 — extractIdentity, extractCriticalRules 등**

```typescript
// tests/adapter.test.ts에 추가
import {
  // 기존 import에 추가
  extractIdentity,
  extractCriticalRules,
  extractDeliverables,
  extractSuccessMetrics,
  extractDescription,
  extractTags,
  calculateConfidence,
} from '../src/core/adapter';

describe('adapter high-level extractors', () => {
  const sampleMd = `# 🎨 Frontend Developer

## Identity & Memory
You are a senior frontend developer.
**Personality**: Detail-oriented, performance-obsessed
**Communication Style**: Direct, code-first
**Thinking**: Component-driven architecture

## Core Mission
Build production-ready frontend applications with clean architecture.

## Critical Rules
### ALWAYS
- Write semantic HTML
- Use TypeScript strict mode
- Test all components

### NEVER
- Use inline styles
- Skip accessibility attributes

## Technical Deliverables
### Deliverable 1: Component Architecture
React components with proper typing

### Deliverable 2: Performance Optimization
Bundle analysis and lazy loading

## Success Metrics
- Lighthouse score > 90
- Zero accessibility violations
- Bundle size under budget
`;

  const sections = splitIntoSections(sampleMd);

  describe('extractIdentity', () => {
    it('personality, communication, thinking을 추출한다', () => {
      const identity = extractIdentity(sections);
      expect(identity.personality).toContain('Detail-oriented');
      expect(identity.communication).toContain('Direct');
      expect(identity.thinking).toContain('Component');
    });
  });

  describe('extractCriticalRules', () => {
    it('must와 must_not을 분리 추출한다', () => {
      const rules = extractCriticalRules(sections);
      expect(rules.must.length).toBeGreaterThan(0);
      expect(rules.must_not.length).toBeGreaterThan(0);
      expect(rules.must.some(r => r.includes('semantic HTML'))).toBe(true);
      expect(rules.must_not.some(r => r.includes('inline styles'))).toBe(true);
    });
  });

  describe('extractDeliverables', () => {
    it('Deliverable 제목들을 추출한다', () => {
      const deliverables = extractDeliverables(sections);
      expect(deliverables.length).toBeGreaterThan(0);
      expect(deliverables.some(d => d.includes('Component Architecture'))).toBe(true);
    });
  });

  describe('extractSuccessMetrics', () => {
    it('성공 기준을 추출한다', () => {
      const metrics = extractSuccessMetrics(sections);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.some(m => m.includes('Lighthouse'))).toBe(true);
    });
  });

  describe('extractDescription', () => {
    it('Core Mission에서 첫 문장을 추출한다', () => {
      const desc = extractDescription(sections);
      expect(desc).toContain('Build production-ready');
    });
  });

  describe('extractTags', () => {
    it('role, division, name에서 태그를 추출한다', () => {
      const tags = extractTags('Frontend Developer', 'frontend_developer', 'engineering', sampleMd);
      expect(tags).toContain('frontend');
      expect(tags).toContain('engineering');
      expect(tags).toContain('developer');
    });

    it('기술 키워드를 추출한다', () => {
      const tags = extractTags('FE Dev', 'fe_dev', 'engineering', 'Uses React and TypeScript with Next.js');
      expect(tags).toContain('react');
      expect(tags).toContain('typescript');
      expect(tags).toContain('next.js');
    });
  });

  describe('calculateConfidence', () => {
    it('모든 요소가 있으면 높은 confidence를 반환한다', () => {
      const confidence = calculateConfidence(
        { personality: 'A well-defined personality trait', communication: 'Direct style', thinking: 'Systematic approach' },
        { must: ['Rule 1'], must_not: ['Anti-rule 1'] },
        ['Deliverable 1'],
        ['Metric 1'],
      );
      expect(confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('요소가 부족하면 낮은 confidence를 반환한다', () => {
      const confidence = calculateConfidence(
        { personality: 'Short', communication: '', thinking: '' },
        { must: [], must_not: [] },
        [],
        [],
      );
      expect(confidence).toBeLessThan(0.3);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: FAIL — 함수들이 export되지 않음

- [ ] **Step 3: adapter.ts에 고수준 함수 구현**

`src/core/adapter.ts`에 아래 함수들을 추가:

```typescript
// === 고수준 추출 함수 === (adapter.ts에 추가)

export function extractIdentity(sections: Section[]): AgentIdentity {
  const identitySection = findSection(sections, [
    'Identity & Memory', 'Identity', 'Personality', 'Who You Are',
  ]);

  if (!identitySection) {
    const missionSection = findSection(sections, ['Core Mission', 'Mission', 'Purpose']);
    return {
      personality: missionSection?.content.slice(0, 300) || 'Specialized expert agent.',
      communication: '',
      thinking: '',
    };
  }

  const content = identitySection.content;
  const personality = extractBoldField(content, ['Personality', 'Character', 'Identity'])
    || content.slice(0, 300);
  const communication = extractBoldField(content, ['Communication Style', 'Communication', 'Voice', 'Tone'])
    || '';
  const thinking = extractBoldField(content, ['Thinking', 'Approach', 'Process', 'Method'])
    || '';

  return { personality, communication, thinking };
}

export function extractCriticalRules(sections: Section[]): AgentCriticalRules {
  const rulesSection = findSection(sections, [
    'Critical Rules', 'Rules', 'Guidelines', 'Constraints',
  ]);

  if (!rulesSection) {
    return { must: [], must_not: [] };
  }

  const content = rulesSection.content;
  const alwaysMatch = content.match(/###?\s*(?:ALWAYS|Must|Do|Required)[\s\S]*?(?=###?\s*(?:NEVER|Must Not|Don't|Forbidden)|$)/i);
  const neverMatch = content.match(/###?\s*(?:NEVER|Must Not|Don't|Forbidden)[\s\S]*/i);

  const must = alwaysMatch ? extractBulletItems(alwaysMatch[0]) : [];
  const must_not = neverMatch ? extractBulletItems(neverMatch[0]) : [];

  if (must.length === 0 && must_not.length === 0) {
    return { must: extractBulletItems(content), must_not: [] };
  }

  return { must, must_not };
}

export function extractDeliverables(sections: Section[]): string[] {
  const section = findSection(sections, [
    'Technical Deliverables', 'Deliverables', 'Outputs', 'What You Deliver',
  ]);
  if (!section) return [];

  const titles = [...section.content.matchAll(/###?\s*(?:Deliverable\s*\d+[:.]\s*)?(.+)/g)]
    .map(m => m[1].trim())
    .filter(t => t.length > 2 && t.length < 200);

  if (titles.length > 0) return titles;
  return extractBulletItems(section.content).slice(0, 10);
}

export function extractSuccessMetrics(sections: Section[]): string[] {
  const section = findSection(sections, [
    'Success Metrics', 'Metrics', 'KPIs', 'Quality Standards', 'Quality Metrics',
  ]);
  if (!section) return [];
  return extractBulletItems(section.content).slice(0, 10);
}

export function extractDescription(sections: Section[]): string {
  const section = findSection(sections, [
    'Core Mission', 'Mission', 'Purpose', 'Overview',
  ]);
  if (section) {
    const firstSentence = section.content.match(/^[^.!?]+[.!?]/);
    return firstSentence ? firstSentence[0].trim() : section.content.slice(0, 150).trim();
  }
  return '';
}

const TECH_KEYWORDS_REGEX = /(?:React|Vue|Angular|TypeScript|Python|Rust|Go|Swift|Kotlin|C\+\+|GAS|Unreal|Unity|Godot|Node\.js|Next\.js|Docker|Kubernetes|AWS|GCP|Azure|PostgreSQL|MongoDB|Redis|GraphQL|REST|gRPC|CI\/CD|Terraform|Ansible|Figma|Tailwind|SCSS|Jest|Vitest|Playwright|Cypress|Storybook)/gi;

const DIVISION_KR_MAP: Record<string, string[]> = {
  'engineering': ['개발', '엔지니어', '코드', '구현'],
  'design': ['디자인', 'UI', 'UX', '시각'],
  'game-development': ['게임', '레벨', '전투', '시스템'],
  'marketing': ['마케팅', '콘텐츠', 'SNS', '홍보'],
  'sales': ['세일즈', '영업', '제안', '파이프라인'],
  'product': ['기획', '제품', '스프린트', '백로그'],
  'project-management': ['프로젝트', '일정', '관리', '진행'],
  'testing': ['테스트', 'QA', '품질', '검증'],
  'support': ['지원', '운영', '인프라', '모니터링'],
};

export function extractTags(name: string, role: string, division: string, content: string): string[] {
  const tags = new Set<string>();

  role.split('_').forEach(w => tags.add(w.toLowerCase()));
  tags.add(division.toLowerCase());
  name.split(/\s+/).forEach(w => {
    const cleaned = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleaned.length > 2) tags.add(cleaned);
  });

  const techKeywords = content.match(TECH_KEYWORDS_REGEX);
  if (techKeywords) {
    techKeywords.forEach(k => tags.add(k.toLowerCase()));
  }

  const krTags = DIVISION_KR_MAP[division] || [];
  krTags.forEach(t => tags.add(t));

  return Array.from(tags);
}

export function calculateConfidence(
  identity: AgentIdentity,
  rules: AgentCriticalRules,
  deliverables: string[],
  metrics: string[],
): number {
  let score = 0;
  const total = 5;

  if (identity.personality.length > 20) score += 1;
  if (identity.communication.length > 10) score += 0.5;
  if (identity.thinking.length > 10) score += 0.5;
  if (rules.must.length > 0) score += 1;
  if (rules.must_not.length > 0) score += 1;
  if (deliverables.length > 0) score += 1;
  if (metrics.length > 0) score += 1;

  return Math.min(score / total, 1);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: PASS (모든 테스트)

- [ ] **Step 5: 커밋**

```bash
git add src/core/adapter.ts tests/adapter.test.ts
git commit -m "feat: add adapter high-level extractors (identity, rules, deliverables, metrics)"
```

---

### Task 5: adapter.ts — parseAgencyAgentMd + parseAllAgencyAgents

**Files:**
- Modify: `src/core/adapter.ts`
- Modify: `tests/adapter.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/adapter.test.ts에 추가
import { parseAgencyAgentMd, parseAllAgencyAgents } from '../src/core/adapter';

describe('parseAgencyAgentMd', () => {
  it('engineering-frontend-developer.md를 파싱하여 5요소를 추출한다', () => {
    const agentPath = path.resolve('agents/external/agency-agents/engineering/engineering-frontend-developer.md');
    // 파일이 존재하지 않을 수 있으므로 조건부 테스트
    if (!fs.existsSync(agentPath)) {
      console.warn('Skipping: agency-agents submodule not initialized');
      return;
    }
    const agent = parseAgencyAgentMd(agentPath, 'engineering');
    expect(agent).not.toBeNull();
    expect(agent!.name).toContain('Frontend');
    expect(agent!.role).toBe('frontend_developer');
    expect(agent!.identity.personality.length).toBeGreaterThan(20);
    expect(agent!.critical_rules.must.length).toBeGreaterThan(0);
    expect(agent!.tags).toContain('engineering');
    expect(agent!.source.type).toBe('external');
    expect(agent!.confidence).toBeGreaterThanOrEqual(0.3);
  });
});

describe('parseAllAgencyAgents', () => {
  it('agency-agents에서 에이전트를 파싱한다', () => {
    const basePath = path.resolve('agents/external/agency-agents');
    if (!fs.existsSync(basePath)) {
      console.warn('Skipping: agency-agents submodule not initialized');
      return;
    }
    const agents = parseAllAgencyAgents(basePath);
    expect(agents.length).toBeGreaterThan(0);
    for (const agent of agents) {
      expect(agent.confidence).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('모든 에이전트에 division이 설정되어 있다', () => {
    const basePath = path.resolve('agents/external/agency-agents');
    if (!fs.existsSync(basePath)) return;
    const agents = parseAllAgencyAgents(basePath);
    for (const agent of agents) {
      expect(agent.division).toBeTruthy();
    }
  });
});
```

(tests 파일 상단에 `import * as fs from 'fs'; import * as path from 'path';` 추가)

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: FAIL — parseAgencyAgentMd, parseAllAgencyAgents 미구현

- [ ] **Step 3: 메인 파싱 함수 구현**

```typescript
// src/core/adapter.ts에 추가

export function parseAgencyAgentMd(
  filePath: string,
  division: string,
): AgentDefinition | null {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sections = splitIntoSections(content);

  try {
    const name = extractName(content);
    const role = inferRoleFromFileName(filePath);
    const identity = extractIdentity(sections);
    const criticalRules = extractCriticalRules(sections);
    const deliverables = extractDeliverables(sections);
    const successMetrics = extractSuccessMetrics(sections);
    const description = extractDescription(sections);
    const tags = extractTags(name, role, division, content);
    const confidence = calculateConfidence(identity, criticalRules, deliverables, successMetrics);

    return {
      name,
      role,
      description,
      identity,
      critical_rules: criticalRules,
      deliverables,
      success_metrics: successMetrics,
      source: {
        type: 'external',
        repo: 'agency-agents',
        filePath,
        division,
      },
      tags,
      division,
      confidence,
    };
  } catch (err) {
    console.warn(`[adapter] Failed to parse ${filePath}: ${err}`);
    return null;
  }
}

export function parseAllAgencyAgents(basePath: string): AgentDefinition[] {
  const agents: AgentDefinition[] = [];
  const EXCLUDED_DIRS = ['scripts', 'integrations', 'examples', '.github', '.git'];

  const divisions = fs.readdirSync(basePath, { withFileTypes: true })
    .filter(d => d.isDirectory() && !EXCLUDED_DIRS.includes(d.name))
    .map(d => d.name);

  for (const division of divisions) {
    const divPath = path.join(basePath, division);
    const mdFiles = findMdFilesRecursive(divPath);

    for (const mdFile of mdFiles) {
      const agent = parseAgencyAgentMd(mdFile, division);
      if (agent && (agent.confidence ?? 0) >= 0.3) {
        agents.push(agent);
      }
    }
  }

  return agents;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/adapter.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/core/adapter.ts tests/adapter.test.ts
git commit -m "feat: add parseAgencyAgentMd and parseAllAgencyAgents"
```

---

### Task 6: builtin YAML 에이전트 8개 작성

**Files:**
- Create: `agents/builtin/korean-tech-writer.yaml`
- Create: `agents/builtin/unreal-gas-specialist.yaml`
- Create: `agents/builtin/compose-meta-reviewer.yaml`
- Create: `agents/builtin/translator.yaml`
- Create: `agents/builtin/data-pipeline-engineer.yaml`
- Create: `agents/builtin/refactoring-specialist.yaml`
- Create: `agents/builtin/security-auditor-deep.yaml`
- Create: `agents/builtin/complexity-critic.yaml`

- [ ] **Step 1: agents/builtin/ 디렉토리 생성 + 8개 YAML 파일 작성**

명세서 섹션 8의 YAML 내용을 그대로 파일로 작성한다. 각 YAML은 name, role, description, tags, identity, critical_rules, deliverables, success_metrics 필드를 포함.

- [ ] **Step 2: YAML 파싱 검증 테스트 작성**

```typescript
// tests/builtin.test.ts
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const BUILTIN_DIR = path.resolve('agents/builtin');

describe('builtin YAML agents', () => {
  const files = fs.readdirSync(BUILTIN_DIR).filter(f => f.endsWith('.yaml'));

  it('8개 YAML 파일이 존재한다', () => {
    expect(files).toHaveLength(8);
  });

  for (const file of files) {
    describe(file, () => {
      const content = fs.readFileSync(path.join(BUILTIN_DIR, file), 'utf-8');
      const parsed = yaml.parse(content);

      it('필수 필드가 존재한다', () => {
        expect(parsed.name).toBeTruthy();
        expect(parsed.role).toBeTruthy();
        expect(parsed.description).toBeTruthy();
        expect(parsed.tags).toBeInstanceOf(Array);
        expect(parsed.identity).toBeTruthy();
        expect(parsed.identity.personality).toBeTruthy();
        expect(parsed.critical_rules).toBeTruthy();
        expect(parsed.critical_rules.must).toBeInstanceOf(Array);
        expect(parsed.critical_rules.must_not).toBeInstanceOf(Array);
        expect(parsed.deliverables).toBeInstanceOf(Array);
        expect(parsed.success_metrics).toBeInstanceOf(Array);
      });

      it('role이 snake_case 형식이다', () => {
        expect(parsed.role).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });
  }
});
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/builtin.test.ts`
Expected: PASS

- [ ] **Step 4: 커밋**

```bash
git add agents/builtin/ tests/builtin.test.ts
git commit -m "feat: add 8 builtin custom YAML agents"
```

---

### Task 7: catalog.ts — 에이전트 카탈로그

**Files:**
- Create: `src/core/catalog.ts`
- Test: `tests/catalog.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/catalog.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import { AgentCatalog } from '../src/core/catalog';

const BUILTIN_DIR = path.resolve('agents/builtin');
const EXTERNAL_DIR = path.resolve('agents/external/agency-agents');
const hasExternal = fs.existsSync(EXTERNAL_DIR);

describe('AgentCatalog', () => {
  let catalog: AgentCatalog;

  beforeAll(async () => {
    catalog = new AgentCatalog(BUILTIN_DIR, EXTERNAL_DIR);
    await catalog.build();
  });

  it('builtin 에이전트 8개가 로드된다', () => {
    const all = catalog.listAll();
    const builtins = all.filter(e => e.source.type === 'builtin');
    expect(builtins).toHaveLength(8);
  });

  it('findByRole: korean_tech_writer가 builtin에서 매칭된다', () => {
    const agent = catalog.findByRole('korean_tech_writer');
    expect(agent).not.toBeNull();
    expect(agent!.source.type).toBe('builtin');
    expect(agent!.name).toBe('Korean Tech Writer');
  });

  it('findByRole: 존재하지 않는 role은 null을 반환한다', () => {
    const agent = catalog.findByRole('nonexistent_role');
    expect(agent).toBeNull();
  });

  it('searchByTags: 관련 태그로 에이전트를 찾는다', () => {
    const results = catalog.searchByTags(['보안', 'security']);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].entry.role).toBe('security_auditor_deep');
  });

  it('searchByTags: 무관한 태그는 결과가 적다', () => {
    const results = catalog.searchByTags(['quantum', 'teleportation']);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('listByDivision: builtin 디비전이 있다', () => {
    const grouped = catalog.listByDivision();
    expect(grouped['builtin']).toBeDefined();
    expect(grouped['builtin'].length).toBe(8);
  });

  if (hasExternal) {
    it('external 에이전트가 로드된다', () => {
      const all = catalog.listAll();
      const externals = all.filter(e => e.source.type === 'external');
      expect(externals.length).toBeGreaterThan(0);
    });

    it('findByRole: external이 builtin보다 우선한다', () => {
      // frontend_developer는 external에만 있으므로 external에서 매칭
      const agent = catalog.findByRole('frontend_developer');
      if (agent) {
        expect(agent.source.type).toBe('external');
      }
    });
  }
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/catalog.test.ts`
Expected: FAIL

- [ ] **Step 3: catalog.ts 구현**

```typescript
// src/core/catalog.ts
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import type { AgentDefinition, CatalogEntry } from './types';
import { parseAllAgencyAgents, parseAgencyAgentMd } from './adapter';

export class AgentCatalog {
  private entries: CatalogEntry[] = [];
  private agentCache: Map<string, AgentDefinition> = new Map();

  constructor(
    private builtinDir: string,
    private externalDir: string,
  ) {}

  async build(): Promise<void> {
    this.entries = [];
    this.agentCache.clear();

    // 1. builtin
    const builtinEntries = this.loadBuiltinEntries();
    this.entries.push(...builtinEntries);

    // 2. external (agency-agents)
    if (fs.existsSync(this.externalDir)) {
      const externalAgents = parseAllAgencyAgents(this.externalDir);
      for (const agent of externalAgents) {
        const src = agent.source as { type: 'external'; filePath: string };
        this.entries.push({
          name: agent.name,
          role: agent.role,
          description: agent.description,
          tags: agent.tags,
          division: agent.division || 'unknown',
          source: agent.source,
          filePath: src.filePath,
        });
        this.agentCache.set(agent.role, agent);
      }
      console.log(`[catalog] Built: ${builtinEntries.length} builtin + ${externalAgents.length} external = ${this.entries.length} total`);
    } else {
      console.warn(`[catalog] External dir not found: ${this.externalDir}. Using builtin only.`);
      console.log(`[catalog] Built: ${builtinEntries.length} builtin`);
    }
  }

  findByRole(role: string): AgentDefinition | null {
    const normalized = role.toLowerCase().replace(/[-\s]/g, '_');

    // 1순위: external
    const externalEntry = this.entries.find(
      e => e.source.type === 'external' && e.role === normalized
    );
    if (externalEntry) return this.loadAgent(externalEntry);

    // 2순위: builtin
    const builtinEntry = this.entries.find(
      e => e.source.type === 'builtin' && e.role === normalized
    );
    if (builtinEntry) return this.loadAgent(builtinEntry);

    return null;
  }

  searchByTags(queryTags: string[], limit: number = 5): Array<{
    entry: CatalogEntry;
    score: number;
  }> {
    const normalizedQuery = queryTags.map(t => t.toLowerCase());

    const scored = this.entries.map(entry => {
      let score = 0;

      for (const qt of normalizedQuery) {
        if (entry.tags.includes(qt)) score += 2;
        if (entry.role.includes(qt)) score += 3;
        if (entry.name.toLowerCase().includes(qt)) score += 2;
        if (entry.description.toLowerCase().includes(qt)) score += 1;
        if (entry.tags.some(t => t.includes(qt) || qt.includes(t))) score += 1;
      }

      if (entry.source.type === 'external') score += 0.1;

      return { entry, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  listAll(): CatalogEntry[] {
    return [...this.entries];
  }

  listByDivision(): Record<string, CatalogEntry[]> {
    const grouped: Record<string, CatalogEntry[]> = {};
    for (const entry of this.entries) {
      const div = entry.division;
      if (!grouped[div]) grouped[div] = [];
      grouped[div].push(entry);
    }
    return grouped;
  }

  loadAgent(entry: CatalogEntry): AgentDefinition | null {
    if (this.agentCache.has(entry.role)) {
      return this.agentCache.get(entry.role)!;
    }

    if (entry.source.type === 'builtin') {
      return this.loadBuiltinAgent(entry.filePath);
    }

    if (entry.source.type === 'external') {
      const agent = parseAgencyAgentMd(entry.filePath, entry.division);
      if (agent) this.agentCache.set(entry.role, agent);
      return agent;
    }

    return null;
  }

  private loadBuiltinEntries(): CatalogEntry[] {
    if (!fs.existsSync(this.builtinDir)) return [];

    const files = fs.readdirSync(this.builtinDir)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    return files.map(f => {
      const filePath = path.join(this.builtinDir, f);
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.parse(content);
      return {
        name: parsed.name,
        role: parsed.role,
        description: parsed.description || '',
        tags: parsed.tags || [],
        division: 'builtin',
        source: { type: 'builtin' as const, filePath },
        filePath,
      };
    });
  }

  private loadBuiltinAgent(filePath: string): AgentDefinition | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = yaml.parse(content);
      const agent: AgentDefinition = {
        name: parsed.name,
        role: parsed.role,
        description: parsed.description || '',
        identity: parsed.identity,
        critical_rules: parsed.critical_rules,
        deliverables: parsed.deliverables || [],
        success_metrics: parsed.success_metrics || [],
        source: { type: 'builtin', filePath },
        tags: parsed.tags || [],
        division: 'builtin',
      };
      this.agentCache.set(agent.role, agent);
      return agent;
    } catch (err) {
      console.warn(`[catalog] Failed to load builtin ${filePath}: ${err}`);
      return null;
    }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/catalog.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/core/catalog.ts tests/catalog.test.ts
git commit -m "feat: add AgentCatalog with build, findByRole, searchByTags"
```

---

### Task 8: agent-manager.ts — 3-tier 매칭

**Files:**
- Create: `src/core/agent-manager.ts`
- Test: `tests/agent-manager.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```typescript
// tests/agent-manager.test.ts
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

  it('builtin 에이전트가 정확 매칭된다', async () => {
    const result = await manager.matchAgent({
      id: 'task_1',
      role: 'korean_tech_writer',
      action: '한국어 README 작성',
      depends_on: [],
      file_scope: ['docs/'],
    });
    expect(result.agent).not.toBeNull();
    expect(result.agent!.source.type).toBe('builtin');
    expect(result.matchType).toBe('exact');
  });

  it('매칭 실패 시 none을 반환한다', async () => {
    const result = await manager.matchAgent({
      id: 'task_2',
      role: 'quantum_computing_specialist',
      action: '양자 회로 시뮬레이터 구현',
      depends_on: [],
      file_scope: ['src/quantum/'],
    });
    expect(result.agent).toBeNull();
    expect(result.matchType).toBe('none');
  });

  it('태그 유사 매칭이 동작한다', async () => {
    const result = await manager.matchAgent({
      id: 'task_3',
      role: 'security_checker',
      action: '보안 감사 수행',
      depends_on: [],
      file_scope: ['src/'],
    });
    // security 관련 태그로 security_auditor_deep이 후보에 있어야 한다
    if (result.candidates && result.candidates.length > 0) {
      const hasSecurityCandidate = result.candidates.some(c =>
        c.name.toLowerCase().includes('security')
      );
      expect(hasSecurityCandidate).toBe(true);
    }
  });

  it('listAgents가 디비전별 그룹을 반환한다', () => {
    const list = manager.listAgents();
    expect(list.length).toBeGreaterThan(0);
    const builtinGroup = list.find(g => g.division === 'builtin');
    expect(builtinGroup).toBeDefined();
    expect(builtinGroup!.agents.length).toBe(8);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/agent-manager.test.ts`
Expected: FAIL

- [ ] **Step 3: agent-manager.ts 구현**

```typescript
// src/core/agent-manager.ts
import { AgentCatalog } from './catalog';
import type { AgentDefinition, Task } from './types';

export class AgentManager {
  private catalog: AgentCatalog;

  constructor(
    builtinDir: string,
    externalDir: string,
  ) {
    this.catalog = new AgentCatalog(builtinDir, externalDir);
  }

  async initialize(): Promise<void> {
    await this.catalog.build();
  }

  async matchAgent(task: Task): Promise<{
    agent: AgentDefinition | null;
    matchType: 'exact' | 'fuzzy' | 'none';
    candidates?: Array<{ name: string; score: number }>;
  }> {
    // 1. role 정확 매칭 (external 우선)
    const exactMatch = this.catalog.findByRole(task.role);
    if (exactMatch) {
      return { agent: exactMatch, matchType: 'exact' };
    }

    // 2. 태그 유사 매칭
    const queryTags = this.extractQueryTags(task);
    const results = this.catalog.searchByTags(queryTags, 5);

    if (results.length > 0 && results[0].score >= 4) {
      const topAgent = this.catalog.loadAgent(results[0].entry);
      return {
        agent: topAgent,
        matchType: 'fuzzy',
        candidates: results.map(r => ({ name: r.entry.name, score: r.score })),
      };
    }

    if (results.length > 0) {
      return {
        agent: null,
        matchType: 'none',
        candidates: results.map(r => ({ name: r.entry.name, score: r.score })),
      };
    }

    // 3. 매칭 실패
    return { agent: null, matchType: 'none' };
  }

  /**
   * 에이전트 자동 생성 (3-tier 중 tier 3).
   * agency-agents + builtin에서 매칭 실패 시에만 호출.
   * TODO: LLM 브릿지 연동 시 구현. 현재는 stub.
   */
  async createAgent(
    role: string,
    taskDescription: string,
  ): Promise<AgentDefinition> {
    // 향후 구현: agent-creation-guide.md 로드 → LLM 생성 → 안티패턴 주입 → 검증
    throw new Error(`Auto-generation not yet implemented for role: ${role}`);
  }

  listAgents(): {
    division: string;
    agents: Array<{ name: string; role: string; description: string; source: string }>;
  }[] {
    const grouped = this.catalog.listByDivision();
    return Object.entries(grouped).map(([division, entries]) => ({
      division,
      agents: entries.map(e => ({
        name: e.name,
        role: e.role,
        description: e.description,
        source: e.source.type,
      })),
    }));
  }

  private extractQueryTags(task: Task): string[] {
    const tags: string[] = [];

    tags.push(...task.role.split('_'));

    const actionWords = task.action
      .replace(/[^a-zA-Z가-힣0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    tags.push(...actionWords);

    if (task.file_scope) {
      for (const scope of task.file_scope) {
        if (scope.includes('src/') || scope.includes('.ts') || scope.includes('.tsx')) tags.push('engineering', '개발');
        if (scope.includes('docs/') || scope.includes('.md')) tags.push('planning', '기획');
        if (scope.includes('test') || scope.includes('spec')) tags.push('testing', '테스트');
        if (scope.includes('design') || scope.includes('.figma')) tags.push('design', '디자인');
      }
    }

    return [...new Set(tags)];
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/jidong/agentochester && npx vitest run tests/agent-manager.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/core/agent-manager.ts tests/agent-manager.test.ts
git commit -m "feat: add AgentManager with 3-tier matching (external → builtin → generated)"
```

---

### Task 9: config.yaml + Vitest 설정 + 전체 테스트

**Files:**
- Create: `config.yaml`
- Create: `vitest.config.ts`

- [ ] **Step 1: config.yaml 작성**

```yaml
agents:
  builtin_dir: "agents/builtin"
  external_dir: "agents/external/agency-agents"
  matching:
    auto_match_threshold: 4
    max_candidates: 5
  adapter:
    min_confidence: 0.3
    cache_ttl: 3600

execution:
  mode: agent-teams
  timeout: 600000
  env_flag: CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS

llm:
  bridge: claude-cli
  retry: 3
```

- [ ] **Step 2: vitest.config.ts 작성**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});
```

- [ ] **Step 3: 전체 테스트 실행**

Run: `cd /Users/jidong/agentochester && npx vitest run`
Expected: 모든 테스트 PASS

- [ ] **Step 4: 커밋**

```bash
git add config.yaml vitest.config.ts
git commit -m "chore: add config.yaml and vitest configuration"
```

---

### Task 10: 최종 검증 + 정리

- [ ] **Step 1: agency-agents 서브모듈 상태 확인**

Run: `cd /Users/jidong/agentochester && git submodule status`
Expected: agency-agents 커밋 해시 표시

- [ ] **Step 2: 전체 테스트 재실행**

Run: `cd /Users/jidong/agentochester && npx vitest run`
Expected: 모든 테스트 PASS

- [ ] **Step 3: 파싱된 에이전트 수 확인 (수동 검증)**

Run: `cd /Users/jidong/agentochester && npx tsx -e "import { AgentCatalog } from './src/core/catalog'; const c = new AgentCatalog('agents/builtin', 'agents/external/agency-agents'); c.build().then(() => { const all = c.listAll(); console.log('Total:', all.length); const grouped = c.listByDivision(); Object.entries(grouped).forEach(([d, e]) => console.log(d + ':', e.length)); })"`
Expected: builtin: 8, + external 디비전별 에이전트 수 출력

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git status
# 남은 파일이 있으면 커밋
git commit -m "chore: final cleanup and verification"
```
