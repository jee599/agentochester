<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude는 빈 서브에이전트를 스폰한다. AgentCrow가 전문가로 만든다.<br>
  154 전문가 페르소나. Hook 강제 주입. 설정 없음.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-154-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-190_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="../README.md">English</a> •
  한국어 •
  <a href="README.ja.md">日本語</a> •
  <a href="README.zh.md">中文</a>
</p>

---

## 문제

Claude Code가 서브에이전트를 생성하면, 그건 **빈 범용 에이전트**다. 전문성도 없고, 규칙도 없고, 성격도 없다.

```
나: "인증 + 테스트 + 문서 만들어줘"

AgentCrow 없이:
  Agent 1: (빈 껍데기) → 인증 작성       ← 코딩 표준 없음
  Agent 2: (빈 껍데기) → 테스트 작성      ← 커버리지 규칙 없음
  Agent 3: (빈 껍데기) → 문서 작성        ← 스타일 가이드 없음

AgentCrow 사용:
  Agent 1: → 🏗️ Backend Architect 주입
            "데이터 무결성에 편집증적. 마이그레이션 없이 절대 배포 안 함."
  Agent 2: → 🧪 QA Engineer 주입
            "'아마 동작할 걸'을 개인적 모욕으로 받아들임."
  Agent 3: → 📝 Technical Writer 주입
            "모든 문장이 자기 자리를 증명해야 함."
```

**PreToolUse Hook**이 모든 Agent 도구 호출을 가로채서, 서브에이전트가 시작되기 전에 적절한 전문가 페르소나를 자동 주입한다. 수동 선택 없음. 프롬프트 엔지니어링 없음.

---

<a id="install"></a>
## ⚡ 설치

```bash
npm i -g agentcrow
agentcrow init --global
```

명령어 두 개. 이제부터 모든 서브에이전트가 전문가 페르소나를 갖는다.

> [!TIP]
> 확인: `agentcrow status`로 두 Hook(SessionStart + PreToolUse)이 활성 상태인지 본다.

---

<a id="how-it-works"></a>
## ⚙️ 동작 원리

```
  나: "JWT 인증 시스템 만들고 테스트 추가해줘"
                    │
                    ▼
  Claude calls Agent tool:
    { name: "qa_engineer", prompt: "Write E2E tests" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (automatic)            │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Load catalog-index.json  (~5ms)   │
  │    2. Match "qa_engineer"      (exact)  │
  │    3. Load QA Engineer persona          │
  │    4. Prepend to prompt                 │
  └─────────────────────────────────────────┘
                    │
                    ▼
  Subagent spawns with full persona:
    <AGENTCROW_PERSONA>
    You are QA Engineer — test specialist
    ## MUST
    - Test every public function
    - Cover happy path, edge case, error path
    ## MUST NOT
    - Never test implementation details
    - Never use sleep for async waits
    </AGENTCROW_PERSONA>

    Write E2E tests    ← original prompt preserved
```

### 세 가지 매칭 전략

| 우선순위 | 전략 | 예시 |
|----------|------|------|
| 1 | 정확 이름 매칭 | `name: "qa_engineer"` → QA Engineer |
| 2 | 서브에이전트 타입 매칭 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | 키워드 + 동의어 퍼지 매칭 | `"kubernetes deploy"` → DevOps Automator |

퍼지 매칭은 **동의어 맵**(50개 이상)과 **히스토리 학습**을 사용한다 — 자주 쓰는 에이전트가 매칭 우선순위를 가진다.

---

## 👀 Before / After

<table>
<tr>
<td width="50%">

**❌ AgentCrow 없이**
```
Claude가 빈 서브에이전트 생성:
  prompt: "Write tests for auth"

  결과:
  - 범용 테스트 파일
  - AAA 구조 없음
  - 엣지 케이스 누락
  - 커버리지 목표 없음
```

</td>
<td width="50%">

**✅ AgentCrow 사용**
```
QA Engineer 페르소나 주입:
  MUST: test every public function
  MUST NOT: test implementation details

  결과:
  - AAA 구조 테스트
  - Happy path + edge + error 커버
  - 커버리지 리포트 포함
  - CI 설정 생성
```

</td>
</tr>
</table>

---

<a id="agents"></a>
## 🤖 154 에이전트

### 14개 빌트인 에이전트 (수작업 제작)

각 빌트인 에이전트는 성격, MUST/MUST NOT 규칙, 산출물, 성공 지표를 갖추고 있다.

| 에이전트 | 전문 분야 | 핵심 규칙 |
|---------|-----------|----------|
| **Backend Architect** | API, 인증, 데이터베이스, 캐싱 | "마이그레이션 없이 절대 배포 안 함" |
| **Frontend Developer** | React/Next.js, Core Web Vitals | "상속보다 합성, 항상" |
| **QA Engineer** | Unit/Integration/E2E, 커버리지 | "테스트 안 된 코드는 망가진 코드다" |
| **Security Auditor** | OWASP, CVSS, 모든 발견에 PoC | "'코드가 안전하다'는 절대 말 안 함" |
| **UI Designer** | 디자인 시스템, 토큰, 간격 | "토큰 시스템에 없으면 존재하지 않는 거다" |
| **DevOps Automator** | CI/CD, Docker, K8s, 시크릿 | "프로덕션에 :latest 태그 금지" |
| **AI Engineer** | LLM, RAG, 프롬프트 최적화 | "LLM은 가드레일이 필요하다" |
| **Refactoring Specialist** | 코드 스멜, Fowler 카탈로그 | "테스트 없이 절대 리팩토링 안 함" |
| **Complexity Critic** | 순환 복잡도, YAGNI | "증거 없이 복잡하다고 절대 말 안 함" |
| **Data Pipeline Engineer** | ETL, 멱등성, 스키마 | "멱등성은 협상 불가다" |
| **Technical Writer** | API 문서, 가이드, README | "모든 문장이 자기 자리를 증명해야 함" |
| **Translator** | i18n, 로케일 파일, 번역 | "코드 식별자는 절대 번역 안 함" |
| **Compose Meta-Reviewer** | 에이전트 구성 감사 | "70점 미만이면 실행 차단" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 | "GameplayAbilities에서 데미지 계산 금지" |

### 140개 외부 에이전트 (13개 부서)

| 부서 | 수 | 예시 |
|------|---:|------|
| Engineering | 24 | Data Engineer, Mobile Builder, Security Engineer |
| Marketing | 25 | SEO, TikTok, LinkedIn, Douyin Strategist |
| Game Dev | 20 | Godot, Unity, Unreal specialists |
| Design | 8 | Brand Guardian, UX Architect, Visual Storyteller |
| Testing | 8 | Accessibility, API, Performance |
| Sales | 7 | Account, Deal, Outbound Strategist |
| Support | 6 | Analytics, Finance, Customer Support |
| Project Mgmt | 6 | Project Shepherd, Jira Steward |
| Academic | 5 | Anthropologist, Historian, Psychologist |
| Spatial Computing | 4 | XR, Metal, WebXR |
| Specialized | 25 | MCP Builder, Workflow Architect, Data Extraction |
| Product | 1 | Behavioral Nudge Engine |
| Strategy | 1 | NEXUS Handoff Templates |

---

<a id="commands"></a>
## 🔧 명령어

```bash
# Install & Setup
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Lifecycle
agentcrow on / off [--global]   # Enable/disable
agentcrow status                # Check installation
agentcrow doctor                # 12-point diagnostic
agentcrow update                # Fetch latest agents
agentcrow uninstall             # Clean removal

# Agent Management
agentcrow agents                # List all 154 agents
agentcrow agents search <query> # Keyword search
agentcrow add <path|url>        # Add custom agent (.md/.yaml)
agentcrow remove <role>         # Remove custom agent

# Inspect & Debug
agentcrow compose <prompt>      # Preview decomposition (dry run)
agentcrow stats                 # Dispatch history & analytics
agentcrow inject                # Hook handler (internal)

# MCP Server
agentcrow serve                 # Start MCP server (stdio)
```

---

## 📊 통계

```bash
$ agentcrow stats

  🐦 AgentCrow Stats

  Match Quality
    exact  106 (55%)   ← 이름이 직접 매칭됨
    fuzzy   87 (45%)   ← 키워드 + 동의어로 매칭됨
    none     0 (0%)    ← 매칭 없음, 패스스루

  Top Agents
    qa_engineer            89 ████████████████████
    frontend_developer     23 █████
    backend_architect      15 ███
```

---

## 🛡️ 안전 & 성능

| | |
|:---|:---|
| Hook 지연 | Agent 호출당 **50ms 미만** |
| 토큰 오버헤드 | 페르소나당 **약 350 토큰** |
| Fail-open | 인덱스나 바이너리 누락 시 → 패스스루 (장애 없음) |
| 내장 타입 | `Explore`, `Plan`, `general-purpose` → 절대 가로채지 않음 |
| 단순 프롬프트 | 에이전트 디스패치 없음, 오버헤드 제로 |
| `agentcrow off` | 완전히 비활성화, 모든 것 백업 |

> [!IMPORTANT]
> AgentCrow는 Claude를 절대 차단하지 않는다. 무엇이든 실패하면, 원래 프롬프트가 변경 없이 그대로 전달된다.

---

## 🏗️ 아키텍처

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (hand-crafted)
  │   ├── external/         140 MD (agency-agents + community)
  │   └── md/               154 unified .md files
  ├── catalog-index.json    Pre-built for <5ms lookup
  └── history.json          Dispatch records (last 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  ├── hooks/
  │   └── agentcrow-inject.sh
  └── agents/
      └── INDEX.md          Agent catalog
```

---

## ➕ 커스텀 에이전트

```bash
agentcrow add ./my-agent.yaml           # Local file
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Remove (custom only)
```

에이전트 형식 (`.md` 또는 `.yaml`):

```markdown
# My Custom Agent

> One-line mission statement

**Role:** my_custom_agent

## Identity
How this agent thinks and works.

## MUST
- Rule 1
- Rule 2

## MUST NOT
- Anti-pattern 1
- Anti-pattern 2
```

---

## 🔌 MCP 서버 (선택)

```bash
agentcrow init --global --mcp
```

Claude Code에 3개 도구를 추가한다: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`.

---

## 🤝 기여하기

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 190 tests
```

## 📜 라이선스

MIT

---

<p align="center">
  <b>🐦 모든 서브에이전트는 페르소나를 가질 자격이 있다.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
