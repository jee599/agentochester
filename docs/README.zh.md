<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude生成空白子代理。AgentCrow让它们成为专家。<br>
  154个专家人格。Hook强制执行。零配置。
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
  <a href="README.ja.md">日本語</a> •
  中文
</p>

---

## 问题

Claude Code生成子代理时，它是一个**空白的通用助手**。没有专业知识，没有规则，没有个性。

```
你: "构建认证 + 测试 + 文档"

没有AgentCrow:
  Agent 1: (空白) → 写认证代码       ← 没有编码规范
  Agent 2: (空白) → 写测试           ← 没有覆盖率规则
  Agent 3: (空白) → 写文档           ← 没有风格指南

使用AgentCrow:
  Agent 1: → 🏗️ 注入后端架构师
            "对数据完整性极度严谨。没有迁移脚本绝不上线。"
  Agent 2: → 🧪 注入QA工程师
            "把'大概能用'视为人身侮辱。"
  Agent 3: → 📝 注入技术写作者
            "每一句话都要有存在的价值。"
```

一个**PreToolUse Hook**拦截每个Agent tool调用，在子代理启动之前自动注入正确的专家人格。无需手动选择，无需提示词工程。

---

<a id="install"></a>
## ⚡ 安装

```bash
npm i -g agentcrow
agentcrow init --global
```

两条命令。从现在开始，每个子代理都会获得专家人格。

> [!TIP]
> 验证: `agentcrow status` 应显示两个Hook（SessionStart + PreToolUse）处于激活状态。

---

<a id="how-it-works"></a>
## ⚙️ 工作原理

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

### 三种匹配策略

| 优先级 | 策略 | 示例 |
|--------|------|------|
| 1 | 名称精确匹配 | `name: "qa_engineer"` → QA Engineer |
| 2 | 子代理类型匹配 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | 关键词 + 同义词模糊匹配 | `"kubernetes deploy"` → DevOps Automator |

模糊匹配使用**同义词映射表**（50+条目）和**历史学习** — 你常用的代理会获得更高的匹配优先级。

---

## 👀 使用前 / 使用后

<table>
<tr>
<td width="50%">

**❌ 没有AgentCrow**
```
Claude生成空白子代理:
  prompt: "为认证编写测试"

  结果:
  - 通用测试文件
  - 没有AAA结构
  - 跳过边界情况
  - 没有覆盖率目标
```

</td>
<td width="50%">

**✅ 使用AgentCrow**
```
注入QA工程师人格:
  MUST: 测试每个公共函数
  MUST NOT: 不测试实现细节

  结果:
  - AAA结构的测试
  - 覆盖正常路径 + 边界 + 错误
  - 包含覆盖率报告
  - 生成CI配置
```

</td>
</tr>
</table>

---

<a id="agents"></a>
## 🤖 154个代理

### 14个手工打造的内置代理

每个内置代理都有个性、MUST/MUST NOT规则、交付物和成功指标。

| 代理 | 专长 | 核心规则 |
|------|------|---------|
| **Backend Architect** | API、认证、数据库、缓存 | "没有迁移脚本绝不上线" |
| **Frontend Developer** | React/Next.js、Core Web Vitals | "组合优于继承，永远如此" |
| **QA Engineer** | 单元/集成/E2E测试、覆盖率 | "未经测试的代码就是有缺陷的代码" |
| **Security Auditor** | OWASP、CVSS、每个发现都有PoC | "永远不说'代码是安全的'" |
| **UI Designer** | 设计系统、token、间距比例 | "不在token系统中的就不存在" |
| **DevOps Automator** | CI/CD、Docker、K8s、密钥管理 | "生产环境禁止使用:latest标签" |
| **AI Engineer** | LLM、RAG、提示词优化 | "LLM需要护栏" |
| **Refactoring Specialist** | 代码异味、Fowler目录 | "没有测试就不重构" |
| **Complexity Critic** | 圈复杂度、YAGNI | "没有证据就不说复杂" |
| **Data Pipeline Engineer** | ETL、幂等性、Schema | "幂等性不可妥协" |
| **Technical Writer** | API文档、指南、README | "每一句话都要有存在的价值" |
| **Translator** | i18n、locale文件、翻译 | "永远不翻译代码标识符" |
| **Compose Meta-Reviewer** | 审核代理团队组成 | "分数低于70则阻止执行" |
| **Unreal GAS Specialist** | GameplayAbilitySystem、UE5 | "不在GameplayAbilities中做伤害计算" |

### 140个外部代理（13个部门）

| 部门 | 数量 | 示例 |
|------|-----:|------|
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
## 🔧 命令

```bash
# 安装 & 设置
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# 生命周期
agentcrow on / off [--global]   # 启用/禁用
agentcrow status                # 检查安装状态
agentcrow doctor                # 12项诊断
agentcrow update                # 获取最新代理
agentcrow uninstall             # 完全卸载

# 代理管理
agentcrow agents                # 列出全部154个代理
agentcrow agents search <query> # 关键词搜索
agentcrow add <path|url>        # 添加自定义代理（.md/.yaml）
agentcrow remove <role>         # 删除自定义代理

# 检查 & 调试
agentcrow compose <prompt>      # 预览分解（模拟运行）
agentcrow stats                 # 调度历史 & 分析
agentcrow inject                # Hook处理器（内部）

# MCP服务器
agentcrow serve                 # 启动MCP服务器（stdio）
```

---

## 📊 统计

```bash
$ agentcrow stats

  🐦 AgentCrow Stats

  Match Quality
    exact  106 (55%)   ← 名称直接匹配
    fuzzy   87 (45%)   ← 关键词 + 同义词匹配
    none     0 (0%)    ← 无匹配，直通

  Top Agents
    qa_engineer            89 ████████████████████
    frontend_developer     23 █████
    backend_architect      15 ███
```

---

## 🛡️ 安全性 & 性能

| | |
|:---|:---|
| Hook延迟 | 每次Agent调用**< 50ms** |
| Token开销 | 每次人格注入**约350 tokens** |
| 失败开放 | 索引或二进制文件缺失 → 直通（不中断） |
| 内置类型 | `Explore`、`Plan`、`general-purpose` → 不拦截 |
| 简单提示 | 不调度代理，零开销 |
| `agentcrow off` | 完全禁用，全部备份 |

> [!IMPORTANT]
> AgentCrow永远不会阻塞Claude。如果发生任何故障，原始提示词会原样直通。

---

## 🏗️ 架构

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

## ➕ 自定义代理

```bash
agentcrow add ./my-agent.yaml           # 本地文件
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # 删除（仅限自定义）
```

代理格式（`.md` 或 `.yaml`）:

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

## 🔌 MCP服务器（可选）

```bash
agentcrow init --global --mcp
```

为Claude Code添加3个工具: `agentcrow_match`、`agentcrow_search`、`agentcrow_list`。

---

## 🤝 贡献

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 190 tests
```

## 📜 许可证

MIT

---

<p align="center">
  <b>🐦 每个子代理都值得拥有一个人格。</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
