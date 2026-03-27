<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Claude生成的每个子代理都会自动获得专家人格。<br>
  150个代理。Hook强制执行。零配置。
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">问题</a> •
  <a href="#quickstart">快速开始</a> •
  <a href="#how-it-works">工作原理</a> •
  <a href="#commands">命令</a> •
  <a href="#agents">代理</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="../README.md">English</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## 问题

Claude Code生成子代理时，它是一个**空白的通用助手**。没有专业知识，没有规则，没有个性。它执行你的请求，但不是*以专家的方式*执行。

```
你: "构建一个带认证、测试和文档的SaaS"

Claude生成4个子代理:
  Agent 1: (空白) → 写认证代码
  Agent 2: (空白) → 写测试
  Agent 3: (空白) → 写文档
  Agent 4: (空白) → 写UI

  = 通用输出
  = 没有编码规范
  = 没有专家知识
```

AgentCrow解决了这个问题。一个**PreToolUse Hook**拦截每个Agent tool调用，在子代理启动之前注入正确的专家人格：

```
你: 相同的提示词

AgentCrow拦截每个Agent tool调用:
  Agent 1: → 🏗️ 注入后端架构师人格
            "对数据完整性极度严谨。没有迁移脚本绝不上线。"
  Agent 2: → 🧪 注入QA工程师人格
            "把'大概能用'视为人身侮辱。"
  Agent 3: → 📝 注入技术写作者人格
            "每一句话都要有存在的价值。"
  Agent 4: → 🖥️ 注入前端开发者人格
            "组合优于继承，永远如此。"

  = 专家级输出
  = MUST/MUST NOT规则强制执行
  = 明确的交付物定义
```

**没有其他工具能做到这一点。** ECC（100K⭐）不行，agency-agents（59K⭐）不行，wshobson（31K⭐）也不行。AgentCrow是唯一在Hook层面强制执行人格注入的工具。

---

<a id="quickstart"></a>
## ⚡ 快速开始

```bash
npm i -g agentcrow
agentcrow init --global
```

就这样。两条命令。从现在开始：
- 复杂提示 → Claude分解为任务 → 生成子代理
- 每个子代理 → AgentCrow的Hook拦截 → 注入专家人格
- 子代理以专家身份工作，而非通用助手

> [!TIP]
> 英语用户: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ 工作原理

```
你的提示: "构建一个带认证、测试和文档的Todo应用"
                    │
                    ▼
  Claude分解为4个任务
                    │
                    ▼
  Claude调用Agent tool:
    { name: "qa_engineer", prompt: "编写E2E测试" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook（自动）                │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. 加载catalog-index.json（~5ms）    │
  │    2. 匹配"qa_engineer" → 精确匹配     │
  │    3. 加载QA工程师人格                  │
  │    4. 通过updatedInput前置到提示词      │
  └─────────────────────────────────────────┘
                    │
                    ▼
  子代理带完整人格启动:
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

    Write E2E tests    ← 原始提示词保留
```

### 三种匹配策略

| 优先级 | 策略 | 示例 |
|--------|------|------|
| 1 | 名称精确匹配 | `name: "qa_engineer"` → QA Engineer |
| 2 | 子代理类型匹配 | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | 关键词 + 同义词模糊匹配 | `"kubernetes helm deploy"` → DevOps Automator |

模糊匹配使用**同义词映射表**（50+条目）和**历史学习** — 你常用的代理会获得更高的匹配优先级。

内置Claude类型（`Explore`、`Plan`、`general-purpose`）不会被拦截。

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
  - 15分钟的平庸输出
```

</td>
<td width="50%">

**✅ 使用AgentCrow**
```
AgentCrow注入QA人格:
  prompt: <AGENTCROW_PERSONA>
    MUST: 测试每个公共函数
    MUST NOT: 不测试实现细节
    Deliverables: 单元 + 集成 + E2E
  </AGENTCROW_PERSONA>
  为认证编写测试

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
agentcrow agents                # 列出全部150个代理
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

<a id="agents"></a>
## 🤖 150个代理

### 14个手工打造的内置代理

每个内置代理都有个性、沟通风格、思维模型、MUST/MUST NOT规则、交付物和成功指标。

| 代理 | 功能 | 核心规则 |
|------|------|---------|
| **Frontend Developer** | React/Next.js、Core Web Vitals、WCAG AA | "组合优于继承，永远如此" |
| **Backend Architect** | API设计、认证、数据库、缓存 | "没有迁移脚本绝不上线" |
| **QA Engineer** | 单元/集成/E2E测试、覆盖率 | "未经测试的代码就是有缺陷的代码" |
| **Security Auditor** | OWASP、CVSS评分、每个发现都有PoC | "永远不说'代码是安全的'" |
| **UI Designer** | 设计系统、token、间距比例 | "不在token系统中的就不存在" |
| **DevOps Automator** | CI/CD、Docker、K8s、密钥管理 | "生产环境禁止使用:latest标签" |
| **AI Engineer** | LLM集成、RAG、提示词优化 | "LLM是需要护栏的不可靠组件" |
| **Refactoring Specialist** | 代码异味、Fowler目录、绞杀者模式 | "没有测试就不重构" |
| **Complexity Critic** | 圈复杂度、YAGNI执行 | "没有证据就不说复杂" |
| **Data Pipeline Engineer** | ETL、幂等性、Schema迁移 | "幂等性不可妥协" |
| **Technical Writer** | API文档、指南、README | "每一句话都要有存在的价值" |
| **Translator** | i18n、locale文件、技术翻译 | "永远不翻译代码标识符" |
| **Compose Meta-Reviewer** | 审核代理团队组成 | "分数低于70则阻止执行" |
| **Unreal GAS Specialist** | GameplayAbilitySystem、UE5 C++ | "不在GameplayAbilities中做伤害计算" |

### 136个外部代理（13个部门）

来自[agency-agents](https://github.com/msitarzewski/agency-agents): engineering、game-dev、design、marketing、testing、sales、support、product、strategy、spatial-computing、academic、paid-media、project-management。

---

## ➕ 自定义代理

```bash
agentcrow add ./my-agent.yaml           # 本地文件
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # 删除（仅限自定义）
```

---

## 🔌 MCP服务器（可选）

```bash
agentcrow init --global --mcp
```

为Claude Code添加3个工具: `agentcrow_match`、`agentcrow_search`、`agentcrow_list`。Claude可以通过编程方式查询代理目录。

---

## 📊 统计

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← 名称直接匹配
    fuzzy   7 (15%)    ← 关键词 + 同义词匹配
    none    2 (4%)     ← 无匹配，直通

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ 安全性 & 性能

| | |
|:---|:---|
| Hook延迟 | 每次Agent tool调用**< 50ms** |
| Token开销 | 每次人格注入**约350 tokens** |
| 失败开放 | 索引或二进制文件缺失 → 直通（不中断） |
| Claude内置类型 | `Explore`、`Plan`、`general-purpose` → 不拦截 |
| 简单提示 | 不调度代理，零开销 |
| `agentcrow off` | 完全禁用，全部备份 |

---

## 🏗️ 架构

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML（手工打造）
  │   ├── external/         136 MD（agency-agents）
  │   └── md/               150 统一 .md 文件
  ├── catalog-index.json    预构建，查询 <5ms
  └── history.json          调度记录（最近1000条）

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 贡献

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
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
