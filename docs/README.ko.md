<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude가 생성하는 모든 서브에이전트에 전문가 페르소나를 자동 주입한다.<br>
  150개 에이전트. Hook 기반. 설정 제로.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">문제</a> •
  <a href="#quickstart">빠른 시작</a> •
  <a href="#how-it-works">동작 원리</a> •
  <a href="#commands">명령어</a> •
  <a href="#agents">에이전트</a> •
  한국어 •
  <a href="README.ja.md">日本語</a> •
  <a href="README.zh.md">中文</a>
</p>

---

<a id="the-problem"></a>
## 문제

Claude Code가 서브에이전트를 생성하면, 그 에이전트는 **빈 껍데기 범용 에이전트**다. 전문성도 없고, 규칙도 없고, 성격도 없다. 시킨 건 하지만, *전문가가 하는 방식*으로 하지는 않는다.

```
나: "인증, 테스트, 문서 포함해서 SaaS 만들어줘"

Claude가 서브에이전트 4개 생성:
  에이전트 1: (빈 껍데기) → 인증 코드 작성
  에이전트 2: (빈 껍데기) → 테스트 작성
  에이전트 3: (빈 껍데기) → 문서 작성
  에이전트 4: (빈 껍데기) → UI 작성

  = 범용적인 결과물
  = 코딩 표준 미적용
  = 전문 지식 미반영
```

AgentCrow가 이 문제를 해결한다. **PreToolUse Hook**이 모든 Agent 도구 호출을 가로채서, 서브에이전트가 시작되기 전에 적절한 전문가 페르소나를 주입한다:

```
나: 같은 프롬프트

AgentCrow가 각 Agent 도구 호출을 가로챈다:
  에이전트 1: → 🏗️ Backend Architect 페르소나 주입
            "데이터 무결성에 편집증적. 마이그레이션 없이 절대 배포 안 함."
  에이전트 2: → 🧪 QA Engineer 페르소나 주입
            "'아마 동작할 걸'을 개인적 모욕으로 받아들임."
  에이전트 3: → 📝 Technical Writer 페르소나 주입
            "모든 문장이 자기 자리를 증명해야 함."
  에이전트 4: → 🖥️ Frontend Developer 페르소나 주입
            "상속보다 합성, 항상."

  = 전문가 수준 결과물
  = MUST/MUST NOT 규칙 적용
  = 구체적 산출물 정의
```

**이런 도구는 다른 곳에 없다.** ECC(100K⭐)도, agency-agents(59K⭐)도, wshobson(31K⭐)도 안 한다. AgentCrow는 Hook 레벨에서 페르소나 주입을 강제하는 유일한 도구다.

---

<a id="quickstart"></a>
## ⚡ 빠른 시작

```bash
npm i -g agentcrow
agentcrow init --global
```

이게 전부다. 명령어 두 개. 이제부터:
- 복잡한 프롬프트 → Claude가 태스크로 분해 → 서브에이전트 생성
- 모든 서브에이전트 → AgentCrow Hook이 가로채기 → 전문가 페르소나 주입
- 서브에이전트가 범용이 아닌 전문가로 작동

> [!TIP]
> English: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ 동작 원리

```
프롬프트: "인증, 테스트, 문서 포함해서 todo 앱 만들어줘"
                    │
                    ▼
  Claude가 4개 태스크로 분해
                    │
                    ▼
  Claude가 Agent 도구 호출:
    { name: "qa_engineer", prompt: "E2E 테스트 작성" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (자동)                 │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. catalog-index.json 로드 (~5ms)    │
  │    2. "qa_engineer" 매칭 → 정확 매칭    │
  │    3. QA Engineer 페르소나 로드         │
  │    4. updatedInput으로 프롬프트에 삽입  │
  └─────────────────────────────────────────┘
                    │
                    ▼
  서브에이전트가 전체 페르소나와 함께 시작:
    <AGENTCROW_PERSONA>
    You are QA Engineer — test specialist
    ## Identity
    Treats 'it probably works' as a personal insult.
    ## MUST
    - Test every public function
    - Cover happy path, edge case, error path
    ## MUST NOT
    - Never test implementation details
    - Never use sleep for async waits
    ## Deliverables
    - Unit tests, Integration tests, E2E tests
    </AGENTCROW_PERSONA>

    E2E 테스트 작성    ← 원래 프롬프트 유지
```

### 세 가지 매칭 전략

| 우선순위 | 전략 | 예시 |
|----------|------|------|
| 1 | 정확 이름 매칭 | `name: "qa_engineer"` → QA Engineer |
| 2 | 서브에이전트 타입 매칭 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | 키워드 + 동의어 퍼지 매칭 | `"kubernetes helm deploy"` → DevOps Automator |

퍼지 매칭은 **동의어 맵**(50개 이상)과 **히스토리 학습**을 사용한다 — 자주 쓰는 에이전트가 매칭 우선순위를 가진다.

Claude 내장 타입(`Explore`, `Plan`, `general-purpose`)은 절대 가로채지 않는다.

---

## 👀 Before / After

<table>
<tr>
<td width="50%">

**❌ AgentCrow 없이**
```
Claude가 빈 서브에이전트 생성:
  prompt: "인증 테스트 작성"

  결과:
  - 범용적인 테스트 파일
  - AAA 구조 없음
  - 엣지 케이스 누락
  - 커버리지 목표 없음
  - 15분간 평범한 결과물
```

</td>
<td width="50%">

**✅ AgentCrow 사용**
```
AgentCrow가 QA 페르소나 주입:
  prompt: <AGENTCROW_PERSONA>
    MUST: test every public function
    MUST NOT: test implementation details
    Deliverables: unit + integration + E2E
  </AGENTCROW_PERSONA>
  인증 테스트 작성

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

<a id="commands"></a>
## 🔧 명령어

```bash
# 설치 & 설정
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# 라이프사이클
agentcrow on / off [--global]   # 활성화/비활성화
agentcrow status                # 설치 상태 확인
agentcrow doctor                # 12단계 진단
agentcrow update                # 최신 에이전트 가져오기
agentcrow uninstall             # 깔끔하게 제거

# 에이전트 관리
agentcrow agents                # 전체 150개 에이전트 목록
agentcrow agents search <query> # 키워드 검색
agentcrow add <path|url>        # 커스텀 에이전트 추가 (.md/.yaml)
agentcrow remove <role>         # 커스텀 에이전트 제거

# 검사 & 디버그
agentcrow compose <prompt>      # 분해 미리보기 (dry run)
agentcrow stats                 # 디스패치 이력 & 분석
agentcrow inject                # Hook 핸들러 (내부용)

# MCP 서버
agentcrow serve                 # MCP 서버 시작 (stdio)
```

---

<a id="agents"></a>
## 🤖 150개 에이전트

### 14개 빌트인 에이전트 (수작업 제작)

각 빌트인 에이전트는 성격, 커뮤니케이션 스타일, 사고 모델, MUST/MUST NOT 규칙, 산출물, 성공 지표를 갖추고 있다.

| 에이전트 | 역할 | 핵심 규칙 |
|---------|------|----------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "상속보다 합성, 항상" |
| **Backend Architect** | API 설계, 인증, 데이터베이스, 캐싱 | "마이그레이션 없이 절대 배포 안 함" |
| **QA Engineer** | Unit/Integration/E2E 테스트, 커버리지 | "테스트 안 된 코드는 망가진 코드다" |
| **Security Auditor** | OWASP, CVSS 스코어링, 모든 발견 사항에 PoC | "'코드가 안전하다'는 절대 말 안 함" |
| **UI Designer** | 디자인 시스템, 토큰, 간격 스케일 | "토큰 시스템에 없으면 존재하지 않는 거다" |
| **DevOps Automator** | CI/CD, Docker, K8s, 시크릿 관리 | "프로덕션에 :latest 태그 금지" |
| **AI Engineer** | LLM 통합, RAG, 프롬프트 최적화 | "LLM은 가드레일이 필요한 불안정 컴포넌트다" |
| **Refactoring Specialist** | 코드 스멜, Fowler 카탈로그, strangler fig | "테스트 없이 절대 리팩토링 안 함" |
| **Complexity Critic** | 순환 복잡도, YAGNI 적용 | "증거 없이 복잡하다고 절대 말 안 함" |
| **Data Pipeline Engineer** | ETL, 멱등성, 스키마 마이그레이션 | "멱등성은 협상 불가다" |
| **Technical Writer** | API 문서, 가이드, README | "모든 문장이 자기 자리를 증명해야 함" |
| **Translator** | i18n, 로케일 파일, 기술 번역 | "코드 식별자는 절대 번역 안 함" |
| **Compose Meta-Reviewer** | 에이전트 팀 구성 감사 | "70점 미만이면 실행 차단" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "GameplayAbilities에서 데미지 계산 금지" |

### 136개 외부 에이전트 (13개 부서)

출처: [agency-agents](https://github.com/msitarzewski/agency-agents) — engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ 커스텀 에이전트

```bash
agentcrow add ./my-agent.yaml           # 로컬 파일
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # 제거 (커스텀만 가능)
```

---

## 🔌 MCP 서버 (선택)

```bash
agentcrow init --global --mcp
```

Claude Code에 3개 도구를 추가한다: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude가 에이전트 카탈로그를 프로그래밍 방식으로 조회할 수 있다.

---

## 📊 통계

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← 이름이 직접 매칭됨
    fuzzy   7 (15%)    ← 키워드 + 동의어로 매칭됨
    none    2 (4%)     ← 매칭 없음, 패스스루

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ 안전 & 성능

| | |
|:---|:---|
| Hook 지연 | Agent 도구 호출당 **50ms 미만** |
| 토큰 오버헤드 | 페르소나 주입당 **약 350 토큰** |
| Fail-open | 인덱스나 바이너리 누락 시 → 패스스루 (장애 없음) |
| Claude 내장 타입 | `Explore`, `Plan`, `general-purpose` → 절대 가로채지 않음 |
| 단순 프롬프트 | 에이전트 디스패치 없음, 오버헤드 제로 |
| `agentcrow off` | 완전히 비활성화, 모든 것 백업 |

---

## 🏗️ 아키텍처

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (수작업 제작)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 통합 .md 파일
  ├── catalog-index.json    사전 빌드, 5ms 미만 조회
  └── history.json          디스패치 기록 (최근 1000건)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 기여하기

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
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
