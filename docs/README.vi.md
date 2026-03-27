<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Mọi subagent mà Claude tạo ra đều được gán persona chuyên gia — tự động.<br>
  150 agent. Bắt buộc qua Hook. Không cần cấu hình.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Vấn đề</a> •
  <a href="#quickstart">Bắt đầu nhanh</a> •
  <a href="#how-it-works">Cách hoạt động</a> •
  <a href="#commands">Lệnh</a> •
  <a href="#agents">Agent</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## Vấn đề

Khi Claude Code tạo một subagent, nó là một **người tổng quát trống rỗng**. Không chuyên môn, không quy tắc, không cá tính. Nó làm những gì bạn yêu cầu, nhưng không phải *theo cách một chuyên gia sẽ làm*.

```
Bạn: "Xây dựng SaaS với xác thực, test và tài liệu"

Claude tạo 4 subagent:
  Agent 1: (trống) → viết code xác thực
  Agent 2: (trống) → viết test
  Agent 3: (trống) → viết tài liệu
  Agent 4: (trống) → viết UI

  = đầu ra chung chung
  = không có tiêu chuẩn code
  = không áp dụng kiến thức chuyên gia
```

AgentCrow giải quyết vấn đề này. Một **PreToolUse Hook** chặn mọi lệnh gọi Agent tool và tiêm persona chuyên gia phù hợp — trước khi subagent bắt đầu:

```
Bạn: cùng prompt

AgentCrow chặn mọi lệnh gọi Agent tool:
  Agent 1: → 🏗️ Persona Kiến trúc sư Backend được tiêm
            "Cực kỳ nghiêm ngặt về tính toàn vẹn dữ liệu. Không bao giờ deploy mà không có migration."
  Agent 2: → 🧪 Persona Kỹ sư QA được tiêm
            "Coi 'có lẽ chạy được' là sự xúc phạm cá nhân."
  Agent 3: → 📝 Persona Kỹ thuật viên được tiêm
            "Mỗi câu phải xứng đáng với vị trí của nó."
  Agent 4: → 🖥️ Persona Lập trình viên Frontend được tiêm
            "Composition thay vì inheritance, luôn luôn."

  = đầu ra cấp chuyên gia
  = quy tắc MUST/MUST NOT được áp dụng
  = sản phẩm bàn giao cụ thể được xác định
```

**Không có công cụ nào khác làm được điều này.** Không phải ECC (100K⭐), không phải agency-agents (59K⭐), không phải wshobson (31K⭐). AgentCrow là công cụ duy nhất bắt buộc tiêm persona ở cấp Hook.

---

<a id="quickstart"></a>
## ⚡ Bắt đầu nhanh

```bash
npm i -g agentcrow
agentcrow init --global
```

Chỉ vậy thôi. Hai lệnh. Từ bây giờ:
- Prompt phức tạp → Claude phân tách thành nhiệm vụ → tạo subagent
- Mọi subagent → Hook của AgentCrow chặn → tiêm persona chuyên gia
- Subagent hoạt động như chuyên gia, không phải người tổng quát

> [!TIP]
> Người dùng tiếng Anh: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Cách hoạt động

```
Prompt của bạn: "Xây dựng ứng dụng todo với auth, test và docs"
                    │
                    ▼
  Claude phân tách thành 4 nhiệm vụ
                    │
                    ▼
  Claude gọi Agent tool:
    { name: "qa_engineer", prompt: "Viết test E2E" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (tự động)              │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Tải catalog-index.json (~5ms)     │
  │    2. Tìm "qa_engineer" → khớp chính xác│
  │    3. Tải persona QA Engineer           │
  │    4. Thêm vào đầu prompt qua updatedInput│
  └─────────────────────────────────────────┘
                    │
                    ▼
  Subagent khởi động với persona đầy đủ:
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

    Write E2E tests    ← prompt gốc được giữ nguyên
```

### Ba chiến lược khớp

| Ưu tiên | Chiến lược | Ví dụ |
|---------|-----------|-------|
| 1 | Khớp chính xác theo tên | `name: "qa_engineer"` → QA Engineer |
| 2 | Khớp theo loại subagent | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Mờ theo từ khóa + từ đồng nghĩa | `"kubernetes helm deploy"` → DevOps Automator |

Khớp mờ sử dụng **bản đồ từ đồng nghĩa** (50+ mục) và **học từ lịch sử** — agent bạn dùng thường xuyên sẽ được ưu tiên khớp cao hơn.

Các loại Claude tích hợp (`Explore`, `Plan`, `general-purpose`) không bao giờ bị chặn.

---

## 👀 Trước / Sau

<table>
<tr>
<td width="50%">

**❌ Không có AgentCrow**
```
Claude tạo subagent trống:
  prompt: "Viết test cho auth"

  Kết quả:
  - File test chung chung
  - Không có cấu trúc AAA
  - Bỏ qua các trường hợp biên
  - Không có mục tiêu coverage
  - 15 phút đầu ra tầm thường
```

</td>
<td width="50%">

**✅ Với AgentCrow**
```
AgentCrow tiêm persona QA:
  prompt: <AGENTCROW_PERSONA>
    MUST: test mọi hàm public
    MUST NOT: không test chi tiết triển khai
    Deliverables: unit + integration + E2E
  </AGENTCROW_PERSONA>
  Viết test cho auth

  Kết quả:
  - Test có cấu trúc AAA
  - Happy path + edge + error được cover
  - Báo cáo coverage đi kèm
  - Cấu hình CI được tạo
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Lệnh

```bash
# Cài đặt & Thiết lập
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Vòng đời
agentcrow on / off [--global]   # Bật/Tắt
agentcrow status                # Kiểm tra cài đặt
agentcrow doctor                # Chẩn đoán 12 điểm
agentcrow update                # Lấy agent mới nhất
agentcrow uninstall             # Gỡ cài đặt sạch

# Quản lý Agent
agentcrow agents                # Liệt kê tất cả 150 agent
agentcrow agents search <query> # Tìm kiếm theo từ khóa
agentcrow add <path|url>        # Thêm agent tùy chỉnh (.md/.yaml)
agentcrow remove <role>         # Xóa agent tùy chỉnh

# Kiểm tra & Gỡ lỗi
agentcrow compose <prompt>      # Xem trước phân tách (dry run)
agentcrow stats                 # Lịch sử dispatch & phân tích
agentcrow inject                # Hook handler (nội bộ)

# MCP Server
agentcrow serve                 # Khởi động MCP server (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Agent

### 14 Agent tích hợp thủ công

Mỗi agent tích hợp có cá tính, phong cách giao tiếp, mô hình tư duy, quy tắc MUST/MUST NOT, sản phẩm bàn giao và chỉ số thành công.

| Agent | Chức năng | Quy tắc chính |
|-------|----------|---------------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Composition thay vì inheritance, luôn luôn" |
| **Backend Architect** | Thiết kế API, auth, cơ sở dữ liệu, cache | "Không bao giờ deploy mà không có migration" |
| **QA Engineer** | Test unit/integration/E2E, coverage | "Code chưa test là code hỏng" |
| **Security Auditor** | OWASP, chấm điểm CVSS, PoC cho mọi phát hiện | "Không bao giờ nói 'code an toàn'" |
| **UI Designer** | Hệ thống thiết kế, token, thang spacing | "Nếu không có trong hệ thống token, nó không tồn tại" |
| **DevOps Automator** | CI/CD, Docker, K8s, quản lý secret | "Không có tag :latest trên production" |
| **AI Engineer** | Tích hợp LLM, RAG, tối ưu prompt | "LLM là thành phần không đáng tin cần guardrail" |
| **Refactoring Specialist** | Code smell, danh mục Fowler, strangler fig | "Không bao giờ refactor mà không có test" |
| **Complexity Critic** | Cyclomatic complexity, áp dụng YAGNI | "Không gọi là phức tạp mà không có bằng chứng" |
| **Data Pipeline Engineer** | ETL, idempotency, migration schema | "Idempotency không thể thương lượng" |
| **Technical Writer** | Tài liệu API, hướng dẫn, README | "Mỗi câu phải xứng đáng với vị trí của nó" |
| **Translator** | i18n, file locale, dịch thuật kỹ thuật | "Không bao giờ dịch code identifier" |
| **Compose Meta-Reviewer** | Kiểm toán thành phần đội agent | "Chặn thực thi khi điểm dưới 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Không tính damage trong GameplayAbilities" |

### 136 Agent bên ngoài (13 bộ phận)

Từ [agency-agents](https://github.com/msitarzewski/agency-agents): engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Agent tùy chỉnh

```bash
agentcrow add ./my-agent.yaml           # File cục bộ
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Xóa (chỉ tùy chỉnh)
```

---

## 🔌 MCP Server (Tùy chọn)

```bash
agentcrow init --global --mcp
```

Thêm 3 công cụ vào Claude Code: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude có thể truy vấn danh mục agent theo chương trình.

---

## 📊 Thống kê

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← tên khớp trực tiếp
    fuzzy   7 (15%)    ← từ khóa + từ đồng nghĩa khớp
    none    2 (4%)     ← không khớp, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ An toàn & Hiệu suất

| | |
|:---|:---|
| Độ trễ Hook | **< 50ms** mỗi lệnh gọi Agent tool |
| Token overhead | **~350 token** mỗi lần tiêm persona |
| Fail-open | Thiếu index hoặc binary → passthrough (không gián đoạn) |
| Loại Claude tích hợp | `Explore`, `Plan`, `general-purpose` → không bao giờ bị chặn |
| Prompt đơn giản | Không dispatch agent, không overhead |
| `agentcrow off` | Tắt hoàn toàn, mọi thứ được sao lưu |

---

## 🏗️ Kiến trúc

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (thủ công)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 file .md hợp nhất
  ├── catalog-index.json    Dựng sẵn để tra cứu <5ms
  └── history.json          Bản ghi dispatch (1000 gần nhất)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Đóng góp

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Giấy phép

MIT

---

<p align="center">
  <b>🐦 Mọi subagent đều xứng đáng có một persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
