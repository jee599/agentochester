<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claudeが生成するすべてのサブエージェントに、専門家ペルソナを自動注入。<br>
  150エージェント。Hook強制。設定不要。
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">課題</a> •
  <a href="#quickstart">クイックスタート</a> •
  <a href="#how-it-works">仕組み</a> •
  <a href="#commands">コマンド</a> •
  <a href="#agents">エージェント</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="../README.md">English</a> •
  <a href="README.zh.md">中文</a>
</p>

---

<a id="the-problem"></a>
## 課題

Claude Codeがサブエージェントを生成すると、それは**何の専門性もない汎用エージェント**になる。専門知識なし、ルールなし、個性なし。依頼されたことは実行するが、*専門家がやるようには*やらない。

```
あなた: 「認証・テスト・ドキュメント付きのSaaSを作って」

Claudeが4つのサブエージェントを生成:
  Agent 1: (空白) → 認証コードを書く
  Agent 2: (空白) → テストを書く
  Agent 3: (空白) → ドキュメントを書く
  Agent 4: (空白) → UIを書く

  = 汎用的なアウトプット
  = コーディング規約の適用なし
  = 専門知識の活用なし
```

AgentCrowがこれを解決する。**PreToolUse Hook**がすべてのAgent tool呼び出しをインターセプトし、サブエージェントが起動する前に適切な専門家ペルソナを注入する：

```
あなた: 同じプロンプト

AgentCrowが各Agent tool呼び出しをインターセプト:
  Agent 1: → 🏗️ バックエンドアーキテクトのペルソナを注入
            「データ整合性に徹底的にこだわる。マイグレーションなしでは絶対にリリースしない。」
  Agent 2: → 🧪 QAエンジニアのペルソナを注入
            「"多分動く"は個人的侮辱として扱う。」
  Agent 3: → 📝 テクニカルライターのペルソナを注入
            「すべての文が存在意義を持つ。」
  Agent 4: → 🖥️ フロントエンド開発者のペルソナを注入
            「継承より合成、常に。」

  = 専門家品質のアウトプット
  = MUST/MUST NOTルールの適用
  = 具体的な成果物の定義
```

**これを実現するツールは他にない。** ECC（100K⭐）にも、agency-agents（59K⭐）にも、wshobson（31K⭐）にもない。AgentCrowはHookレベルでペルソナ注入を強制する唯一のツールだ。

---

<a id="quickstart"></a>
## ⚡ クイックスタート

```bash
npm i -g agentcrow
agentcrow init --global
```

以上。たった2つのコマンド。これ以降：
- 複雑なプロンプト → Claudeがタスクに分解 → サブエージェントを生成
- すべてのサブエージェント → AgentCrowのHookがインターセプト → 専門家ペルソナを注入
- サブエージェントは汎用ではなく専門家として動作する

> [!TIP]
> 英語ユーザー: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ 仕組み

```
あなたのプロンプト: 「認証・テスト・ドキュメント付きのTodoアプリを作って」
                    │
                    ▼
  Claudeが4つのタスクに分解
                    │
                    ▼
  ClaudeがAgent toolを呼び出す:
    { name: "qa_engineer", prompt: "E2Eテストを書いて" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook（自動）                │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. catalog-index.jsonをロード（~5ms）│
  │    2. "qa_engineer" → 完全一致          │
  │    3. QAエンジニアのペルソナをロード     │
  │    4. updatedInputでプロンプトに前置    │
  └─────────────────────────────────────────┘
                    │
                    ▼
  フルペルソナ付きでサブエージェントが起動:
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

    Write E2E tests    ← 元のプロンプトは保持
```

### 3つのマッチング戦略

| 優先度 | 戦略 | 例 |
|--------|------|-----|
| 1 | 名前の完全一致 | `name: "qa_engineer"` → QA Engineer |
| 2 | サブエージェントタイプ一致 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | キーワード＋同義語ファジー | `"kubernetes helm deploy"` → DevOps Automator |

ファジーマッチングは**同義語マップ**（50以上のエントリ）と**履歴学習**を使用 — よく使うエージェントのマッチング優先度が上がる。

ビルトインClaudeタイプ（`Explore`、`Plan`、`general-purpose`）はインターセプトされない。

---

## 👀 ビフォー / アフター

<table>
<tr>
<td width="50%">

**❌ AgentCrowなし**
```
Claudeが空白のサブエージェントを生成:
  prompt: "認証のテストを書いて"

  結果:
  - 汎用的なテストファイル
  - AAA構造なし
  - エッジケースをスキップ
  - カバレッジ目標なし
  - 15分かけて凡庸なアウトプット
```

</td>
<td width="50%">

**✅ AgentCrowあり**
```
AgentCrowがQAペルソナを注入:
  prompt: <AGENTCROW_PERSONA>
    MUST: すべてのpublic関数をテスト
    MUST NOT: 実装の詳細をテストしない
    Deliverables: ユニット + インテグレーション + E2E
  </AGENTCROW_PERSONA>
  認証のテストを書いて

  結果:
  - AAA構造のテスト
  - ハッピーパス + エッジ + エラーをカバー
  - カバレッジレポート付き
  - CI設定を生成
```

</td>
</tr>
</table>

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
agentcrow agents                # 全150エージェントの一覧
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

<a id="agents"></a>
## 🤖 150エージェント

### 14のハンドクラフトビルトインエージェント

各ビルトインエージェントは、個性、コミュニケーションスタイル、思考モデル、MUST/MUST NOTルール、成果物、成功指標を持つ。

| エージェント | 機能 | 主要ルール |
|-------------|------|-----------|
| **Frontend Developer** | React/Next.js、Core Web Vitals、WCAG AA | 「継承より合成、常に」 |
| **Backend Architect** | API設計、認証、データベース、キャッシュ | 「マイグレーションなしでリリースしない」 |
| **QA Engineer** | ユニット/インテグレーション/E2Eテスト、カバレッジ | 「テストされていないコードは壊れたコード」 |
| **Security Auditor** | OWASP、CVSSスコアリング、全発見事項にPoC | 「"コードは安全"とは決して言わない」 |
| **UI Designer** | デザインシステム、トークン、スペーシングスケール | 「トークンシステムにないものは存在しない」 |
| **DevOps Automator** | CI/CD、Docker、K8s、シークレット管理 | 「本番環境で:latestタグは禁止」 |
| **AI Engineer** | LLM統合、RAG、プロンプト最適化 | 「LLMはガードレールが必要な信頼性の低いコンポーネント」 |
| **Refactoring Specialist** | コードスメル、Fowlerカタログ、ストラングラーフィグ | 「テストなしにリファクタリングしない」 |
| **Complexity Critic** | 循環的複雑度、YAGNI適用 | 「証拠なしに複雑とは呼ばない」 |
| **Data Pipeline Engineer** | ETL、冪等性、スキーママイグレーション | 「冪等性は交渉の余地なし」 |
| **Technical Writer** | APIドキュメント、ガイド、README | 「すべての文が存在意義を持つ」 |
| **Translator** | i18n、ロケールファイル、技術翻訳 | 「コード識別子は翻訳しない」 |
| **Compose Meta-Reviewer** | エージェントチーム構成の監査 | 「スコア70未満で実行をブロック」 |
| **Unreal GAS Specialist** | GameplayAbilitySystem、UE5 C++ | 「GameplayAbilitiesでダメージ計算しない」 |

### 136の外部エージェント（13部門）

[agency-agents](https://github.com/msitarzewski/agency-agents)から: engineering、game-dev、design、marketing、testing、sales、support、product、strategy、spatial-computing、academic、paid-media、project-management。

---

## ➕ カスタムエージェント

```bash
agentcrow add ./my-agent.yaml           # ローカルファイル
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # 削除（カスタムのみ）
```

---

## 🔌 MCPサーバー（オプション）

```bash
agentcrow init --global --mcp
```

Claude Codeに3つのツールを追加: `agentcrow_match`、`agentcrow_search`、`agentcrow_list`。Claudeがエージェントカタログをプログラム的にクエリできる。

---

## 📊 統計

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← 名前が直接一致
    fuzzy   7 (15%)    ← キーワード + 同義語で一致
    none    2 (4%)     ← 一致なし、パススルー

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ 安全性 & パフォーマンス

| | |
|:---|:---|
| Hookレイテンシ | Agent tool呼び出しあたり**50ms未満** |
| トークンオーバーヘッド | ペルソナ注入あたり**約350トークン** |
| フェイルオープン | インデックスまたはバイナリ欠損時 → パススルー（破損なし） |
| Claudeビルトイン | `Explore`、`Plan`、`general-purpose` → インターセプトしない |
| シンプルなプロンプト | エージェントのディスパッチなし、オーバーヘッドなし |
| `agentcrow off` | 完全無効化、すべてバックアップ |

---

## 🏗️ アーキテクチャ

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML（ハンドクラフト）
  │   ├── external/         136 MD（agency-agents）
  │   └── md/               150 統合 .md ファイル
  ├── catalog-index.json    事前構築で5ms未満のルックアップ
  └── history.json          ディスパッチ記録（直近1000件）

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 コントリビューティング

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
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
