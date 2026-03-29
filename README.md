<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude spawns blank subagents. AgentCrow makes them specialists.<br>
  154 expert personas. Hook-enforced. Zero config.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-154-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-190_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#install">Install</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#agents">Agents</a> •
  <a href="#commands">Commands</a> •
  <a href="docs/README.ko.md">한국어</a> •
  <a href="docs/README.ja.md">日本語</a> •
  <a href="docs/README.zh.md">中文</a>
</p>

---

## The Problem

When Claude Code spawns a subagent, it's a **blank generalist**. No expertise, no rules, no personality.

```
You: "Build auth + tests + docs"

Without AgentCrow:
  Agent 1: (blank) → writes auth       ← no coding standards
  Agent 2: (blank) → writes tests      ← no coverage rules
  Agent 3: (blank) → writes docs       ← no style guide

With AgentCrow:
  Agent 1: → 🏗️ Backend Architect injected
            "Paranoid about data integrity. Never ships without migrations."
  Agent 2: → 🧪 QA Engineer injected
            "Treats 'it probably works' as a personal insult."
  Agent 3: → 📝 Technical Writer injected
            "Every sentence earns its place."
```

A **PreToolUse hook** intercepts every Agent tool call and injects the right expert persona — automatically, before the subagent starts. No manual selection. No prompt engineering.

---

<a id="install"></a>
## ⚡ Install

```bash
npm i -g agentcrow
agentcrow init --global
```

Two commands. Every subagent gets an expert persona from now on.

> [!TIP]
> Verify: `agentcrow status` should show both hooks (SessionStart + PreToolUse) active.

---

<a id="how-it-works"></a>
## ⚙️ How It Works

```
  You: "Build auth system with JWT, add tests"
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

### Three matching strategies

| Priority | Strategy | Example |
|----------|----------|---------|
| 1 | Exact name | `name: "qa_engineer"` → QA Engineer |
| 2 | Subagent type | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Keyword + synonym | `"kubernetes deploy"` → DevOps Automator |

Fuzzy matching uses a **synonym map** (50+ entries) and **history learning** — agents you use often get priority.

---

## 👀 Before / After

<table>
<tr>
<td width="50%">

**❌ Without AgentCrow**
```
Claude spawns blank subagent:
  prompt: "Write tests for auth"

  Result:
  - Generic test file
  - No AAA structure
  - Skipped edge cases
  - No coverage targets
```

</td>
<td width="50%">

**✅ With AgentCrow**
```
QA Engineer persona injected:
  MUST: test every public function
  MUST NOT: test implementation details

  Result:
  - AAA-structured tests
  - Happy path + edge + error covered
  - Coverage report included
  - CI config generated
```

</td>
</tr>
</table>

---

<a id="agents"></a>
## 🤖 154 Agents

### 14 Hand-Crafted Builtin Agents

Each builtin has personality, MUST/MUST NOT rules, deliverables, and success metrics.

| Agent | Specialty | Key Rule |
|-------|-----------|----------|
| **Backend Architect** | API, auth, database, caching | "Never ship without migrations" |
| **Frontend Developer** | React/Next.js, Core Web Vitals | "Composition over inheritance, always" |
| **QA Engineer** | Unit/integration/E2E, coverage | "Untested code is broken code" |
| **Security Auditor** | OWASP, CVSS, PoC for every finding | "Never says 'the code is secure'" |
| **UI Designer** | Design systems, tokens, spacing | "If it's not in the token system, it doesn't exist" |
| **DevOps Automator** | CI/CD, Docker, K8s, secrets | "No :latest tags in production" |
| **AI Engineer** | LLM, RAG, prompt optimization | "LLMs need guardrails" |
| **Refactoring Specialist** | Code smells, Fowler catalog | "Never refactor without tests" |
| **Complexity Critic** | Cyclomatic complexity, YAGNI | "Never call something complex without proof" |
| **Data Pipeline Engineer** | ETL, idempotency, schemas | "Idempotency is non-negotiable" |
| **Technical Writer** | API docs, guides, READMEs | "Every sentence earns its place" |
| **Translator** | i18n, locale files, translation | "Never translate code identifiers" |
| **Compose Meta-Reviewer** | Audit agent compositions | "Block execution below score 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 | "No damage calc in GameplayAbilities" |

### 140 External Agents (13 Divisions)

| Division | Count | Examples |
|----------|------:|---------|
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
## 🔧 Commands

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

## 📊 Stats

```bash
$ agentcrow stats

  🐦 AgentCrow Stats

  Match Quality
    exact  106 (55%)   ← name matched directly
    fuzzy   87 (45%)   ← keyword + synonym matched
    none     0 (0%)    ← no match, passthrough

  Top Agents
    qa_engineer            89 ████████████████████
    frontend_developer     23 █████
    backend_architect      15 ███
```

---

## 🛡️ Safety & Performance

| | |
|:---|:---|
| Hook latency | **< 50ms** per Agent call |
| Token overhead | **~350 tokens** per persona |
| Fail-open | Missing index or binary → passthrough (no breakage) |
| Built-in types | `Explore`, `Plan`, `general-purpose` → never intercepted |
| Simple prompts | No agents dispatched, zero overhead |
| `agentcrow off` | Completely disabled, everything backed up |

> [!IMPORTANT]
> AgentCrow never blocks Claude. If anything fails, the original prompt passes through unchanged.

---

## 🏗️ Architecture

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

## ➕ Custom Agents

```bash
agentcrow add ./my-agent.yaml           # Local file
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Remove (custom only)
```

Agent format (`.md` or `.yaml`):

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

## 🔌 MCP Server (Optional)

```bash
agentcrow init --global --mcp
```

Adds 3 tools to Claude Code: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`.

---

## 🤝 Contributing

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 190 tests
```

## 📜 License

MIT

---

<p align="center">
  <b>🐦 Every subagent deserves a persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
