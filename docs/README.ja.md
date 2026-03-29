<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claudeのサブエージェントは空白で生まれる。AgentCrowが専門家にする。<br>
  154エージェント。Hook強制。設定不要。
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
  <a href="README.ko.md">한국어</a> •
  日本語 •
  <a href="README.zh.md">中文</a>
</p>

---

## 課題

Claude Codeがサブエージェントを生成すると、それは**何の専門性もない汎用エージェント**になる。専門知識なし、ルールなし、個性なし。

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

**PreToolUse Hook**がすべてのAgent tool呼び出しをインターセプトし、サブエージェントが起動する前に適切な専門家ペルソナを自動注入する。手動選択不要。プロンプトエンジニアリング不要。

---

<a id="install"></a>
## ⚡ インストール

```bash
npm i -g agentcrow
agentcrow init --global
```

2つのコマンド。これ以降、すべてのサブエージェントに専門家ペルソナが注入される。

> [!TIP]
> 確認: `agentcrow status` で両方のHook（SessionStart + PreToolUse）がアクティブであることを確認。

---

<a id="how-it-works"></a>
## ⚙️ 仕組み

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

### 3つのマッチング戦略

| 優先度 | 戦略 | 例 |
|--------|------|-----|
| 1 | 名前の完全一致 | `name: "qa_engineer"` → QA Engineer |
| 2 | サブエージェントタイプ一致 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | キーワード＋同義語ファジー | `"kubernetes deploy"` → DevOps Automator |

ファジーマッチングは**同義語マップ**（50以上のエントリ）と**履歴学習**を使用 — よく使うエージェントの優先度が上がる。

---

## 👀 ビフォー / アフター

<table>
<tr>
<td width="50%">

**❌ AgentCrowなし**
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

**✅ AgentCrowあり**
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
## 🤖 154エージェント

### 14のハンドクラフトビルトインエージェント

各ビルトインエージェントは、個性、MUST/MUST NOTルール、成果物、成功指標を持つ。

| エージェント | 専門分野 | 主要ルール |
|-------------|---------|-----------|
| **Backend Architect** | API、認証、データベース、キャッシュ | "Never ship without migrations" |
| **Frontend Developer** | React/Next.js、Core Web Vitals | "Composition over inheritance, always" |
| **QA Engineer** | ユニット/インテグレーション/E2Eテスト、カバレッジ | "Untested code is broken code" |
| **Security Auditor** | OWASP、CVSS、全発見事項にPoC | "Never says 'the code is secure'" |
| **UI Designer** | デザインシステム、トークン、スペーシング | "If it's not in the token system, it doesn't exist" |
| **DevOps Automator** | CI/CD、Docker、K8s、シークレット管理 | "No :latest tags in production" |
| **AI Engineer** | LLM、RAG、プロンプト最適化 | "LLMs need guardrails" |
| **Refactoring Specialist** | コードスメル、Fowlerカタログ | "Never refactor without tests" |
| **Complexity Critic** | 循環的複雑度、YAGNI | "Never call something complex without proof" |
| **Data Pipeline Engineer** | ETL、冪等性、スキーマ | "Idempotency is non-negotiable" |
| **Technical Writer** | APIドキュメント、ガイド、README | "Every sentence earns its place" |
| **Translator** | i18n、ロケールファイル、翻訳 | "Never translate code identifiers" |
| **Compose Meta-Reviewer** | エージェント構成の監査 | "Block execution below score 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem、UE5 | "No damage calc in GameplayAbilities" |

### 140の外部エージェント（13部門）

| 部門 | 数 | 例 |
|------|---:|-----|
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
## 🔧 コマンド

```bash
# インストール & セットアップ
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# ライフサイクル
agentcrow on / off [--global]   # 有効化/無効化
agentcrow status                # インストール状態の確認
agentcrow doctor                # 12項目の診断
agentcrow update                # 最新エージェントの取得
agentcrow uninstall             # クリーンな削除

# エージェント管理
agentcrow agents                # 全154エージェントの一覧
agentcrow agents search <query> # キーワード検索
agentcrow add <path|url>        # カスタムエージェントの追加（.md/.yaml）
agentcrow remove <role>         # カスタムエージェントの削除

# 検査 & デバッグ
agentcrow compose <prompt>      # 分解のプレビュー（ドライラン）
agentcrow stats                 # ディスパッチ履歴 & アナリティクス
agentcrow inject                # Hookハンドラ（内部用）

# MCPサーバー
agentcrow serve                 # MCPサーバーの起動（stdio）
```

---

## 📊 統計

```bash
$ agentcrow stats

  🐦 AgentCrow Stats

  Match Quality
    exact  106 (55%)   ← 名前が直接一致
    fuzzy   87 (45%)   ← キーワード + 同義語で一致
    none     0 (0%)    ← 一致なし、パススルー

  Top Agents
    qa_engineer            89 ████████████████████
    frontend_developer     23 █████
    backend_architect      15 ███
```

---

## 🛡️ 安全性 & パフォーマンス

| | |
|:---|:---|
| Hookレイテンシ | Agent tool呼び出しあたり**50ms未満** |
| トークンオーバーヘッド | ペルソナ注入あたり**約350トークン** |
| フェイルオープン | インデックスまたはバイナリ欠損時 → パススルー（破損なし） |
| ビルトインタイプ | `Explore`、`Plan`、`general-purpose` → インターセプトしない |
| シンプルなプロンプト | エージェントのディスパッチなし、オーバーヘッドゼロ |
| `agentcrow off` | 完全無効化、すべてバックアップ |

> [!IMPORTANT]
> AgentCrowはClaudeをブロックしない。何かが失敗しても、元のプロンプトがそのまま通過する。

---

## 🏗️ アーキテクチャ

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

## ➕ カスタムエージェント

```bash
agentcrow add ./my-agent.yaml           # ローカルファイル
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # 削除（カスタムのみ）
```

エージェント形式（`.md` または `.yaml`）:

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

## 🔌 MCPサーバー（オプション）

```bash
agentcrow init --global --mcp
```

Claude Codeに3つのツールを追加: `agentcrow_match`、`agentcrow_search`、`agentcrow_list`。

---

## 🤝 コントリビューティング

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 190 tests
```

## 📜 ライセンス

MIT

---

<p align="center">
  <b>🐦 すべてのサブエージェントにペルソナを。</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
