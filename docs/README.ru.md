<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Каждый субагент, которого создаёт Claude, получает экспертную персону — автоматически.<br>
  150 агентов. Принудительно через Hook. Без настройки.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Проблема</a> •
  <a href="#quickstart">Быстрый старт</a> •
  <a href="#how-it-works">Как это работает</a> •
  <a href="#commands">Команды</a> •
  <a href="#agents">Агенты</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## Проблема

Когда Claude Code создаёт субагента, тот оказывается **пустым универсалом**. Без экспертизы, без правил, без личности. Он делает то, что вы попросили, но не *так, как это сделал бы специалист*.

```
Вы: "Построй SaaS с аутентификацией, тестами и документацией"

Claude создаёт 4 субагента:
  Agent 1: (пустой) → пишет код аутентификации
  Agent 2: (пустой) → пишет тесты
  Agent 3: (пустой) → пишет документацию
  Agent 4: (пустой) → пишет UI

  = типовой результат
  = без стандартов кода
  = без специализированных знаний
```

AgentCrow решает эту проблему. **PreToolUse Hook** перехватывает каждый вызов Agent tool и внедряет нужную экспертную персону — до того, как субагент запустится:

```
Вы: тот же промпт

AgentCrow перехватывает каждый вызов Agent tool:
  Agent 1: → 🏗️ Персона Backend-архитектора внедрена
            "Параноидально относится к целостности данных. Никогда не деплоит без миграций."
  Agent 2: → 🧪 Персона QA-инженера внедрена
            "Воспринимает 'наверное работает' как личное оскорбление."
  Agent 3: → 📝 Персона технического писателя внедрена
            "Каждое предложение заслуживает своё место."
  Agent 4: → 🖥️ Персона Frontend-разработчика внедрена
            "Композиция вместо наследования, всегда."

  = результат уровня специалиста
  = правила MUST/MUST NOT применены
  = конкретные результаты определены
```

**Ни один другой инструмент этого не делает.** Ни ECC (100K⭐), ни agency-agents (59K⭐), ни wshobson (31K⭐). AgentCrow — единственный инструмент, принудительно внедряющий персоны на уровне Hook.

---

<a id="quickstart"></a>
## ⚡ Быстрый старт

```bash
npm i -g agentcrow
agentcrow init --global
```

Готово. Две команды. С этого момента:
- Сложный промпт → Claude декомпозирует на задачи → создаёт субагентов
- Каждый субагент → Hook AgentCrow перехватывает → внедряет экспертную персону
- Субагент работает как специалист, а не универсал

> [!TIP]
> Англоязычные пользователи: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Как это работает

```
Ваш промпт: "Построй приложение задач с auth, тестами и документацией"
                    │
                    ▼
  Claude декомпозирует на 4 задачи
                    │
                    ▼
  Claude вызывает Agent tool:
    { name: "qa_engineer", prompt: "Напиши E2E тесты" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (автоматический)       │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Загружает catalog-index.json (~5ms)│
  │    2. Ищет "qa_engineer" → точное совпадение│
  │    3. Загружает персону QA Engineer     │
  │    4. Добавляет в начало через updatedInput│
  └─────────────────────────────────────────┘
                    │
                    ▼
  Субагент запускается с полной персоной:
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

    Write E2E tests    ← оригинальный промпт сохранён
```

### Три стратегии сопоставления

| Приоритет | Стратегия | Пример |
|-----------|----------|--------|
| 1 | Точное совпадение имени | `name: "qa_engineer"` → QA Engineer |
| 2 | Совпадение по типу субагента | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Нечёткое по ключевому слову + синониму | `"kubernetes helm deploy"` → DevOps Automator |

Нечёткое сопоставление использует **карту синонимов** (50+ записей) и **обучение на истории** — часто используемые агенты получают более высокий приоритет.

Встроенные типы Claude (`Explore`, `Plan`, `general-purpose`) никогда не перехватываются.

---

## 👀 До / После

<table>
<tr>
<td width="50%">

**❌ Без AgentCrow**
```
Claude создаёт пустого субагента:
  prompt: "Напиши тесты для auth"

  Результат:
  - Типовой файл с тестами
  - Без структуры AAA
  - Граничные случаи пропущены
  - Без целей покрытия
  - 15 минут посредственного результата
```

</td>
<td width="50%">

**✅ С AgentCrow**
```
AgentCrow внедряет QA-персону:
  prompt: <AGENTCROW_PERSONA>
    MUST: тестировать каждую публичную функцию
    MUST NOT: не тестировать детали реализации
    Deliverables: юнит + интеграционные + E2E
  </AGENTCROW_PERSONA>
  Напиши тесты для auth

  Результат:
  - Тесты со структурой AAA
  - Happy path + edge + error покрыты
  - Отчёт о покрытии включён
  - Конфигурация CI сгенерирована
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Команды

```bash
# Установка & Настройка
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Жизненный цикл
agentcrow on / off [--global]   # Включить/выключить
agentcrow status                # Проверить установку
agentcrow doctor                # 12-пунктная диагностика
agentcrow update                # Получить последних агентов
agentcrow uninstall             # Чистое удаление

# Управление агентами
agentcrow agents                # Список всех 150 агентов
agentcrow agents search <query> # Поиск по ключевому слову
agentcrow add <path|url>        # Добавить пользовательского агента (.md/.yaml)
agentcrow remove <role>         # Удалить пользовательского агента

# Инспекция & Отладка
agentcrow compose <prompt>      # Предпросмотр декомпозиции (dry run)
agentcrow stats                 # История диспетчеризации & аналитика
agentcrow inject                # Обработчик Hook (внутренний)

# MCP-сервер
agentcrow serve                 # Запустить MCP-сервер (stdio)
```

---

<a id="agents"></a>
## 🤖 150 агентов

### 14 встроенных агентов ручной работы

Каждый встроенный агент имеет личность, стиль общения, модель мышления, правила MUST/MUST NOT, результаты и метрики успеха.

| Агент | Функция | Ключевое правило |
|-------|---------|-----------------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Композиция вместо наследования, всегда" |
| **Backend Architect** | Проектирование API, auth, база данных, кэширование | "Никогда не деплоить без миграций" |
| **QA Engineer** | Юнит/интеграционные/E2E тесты, покрытие | "Непротестированный код — сломанный код" |
| **Security Auditor** | OWASP, оценка CVSS, PoC для каждой находки | "Никогда не говорит 'код безопасен'" |
| **UI Designer** | Дизайн-системы, токены, шкалы отступов | "Если нет в системе токенов — не существует" |
| **DevOps Automator** | CI/CD, Docker, K8s, управление секретами | "Никаких тегов :latest в продакшене" |
| **AI Engineer** | Интеграция LLM, RAG, оптимизация промптов | "LLM — ненадёжные компоненты, требующие ограждений" |
| **Refactoring Specialist** | Code smells, каталог Фаулера, strangler fig | "Никогда не рефакторить без тестов" |
| **Complexity Critic** | Цикломатическая сложность, применение YAGNI | "Никогда не называть сложным без доказательств" |
| **Data Pipeline Engineer** | ETL, идемпотентность, миграции схем | "Идемпотентность не обсуждается" |
| **Technical Writer** | Документация API, руководства, README | "Каждое предложение заслуживает своё место" |
| **Translator** | i18n, файлы локалей, техническая локализация | "Никогда не переводить идентификаторы кода" |
| **Compose Meta-Reviewer** | Аудит составов команд агентов | "Блокировать выполнение при оценке ниже 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Никакого расчёта урона в GameplayAbilities" |

### 136 внешних агентов (13 подразделений)

Из [agency-agents](https://github.com/msitarzewski/agency-agents): engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Пользовательские агенты

```bash
agentcrow add ./my-agent.yaml           # Локальный файл
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Удалить (только пользовательские)
```

---

## 🔌 MCP-сервер (Опционально)

```bash
agentcrow init --global --mcp
```

Добавляет 3 инструмента в Claude Code: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude может программно запрашивать каталог агентов.

---

## 📊 Статистика

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← имя совпало напрямую
    fuzzy   7 (15%)    ← ключевое слово + синоним
    none    2 (4%)     ← нет совпадения, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Безопасность & Производительность

| | |
|:---|:---|
| Задержка Hook | **< 50мс** на вызов Agent tool |
| Накладные расходы токенов | **~350 токенов** на инъекцию персоны |
| Fail-open | Отсутствие индекса или бинарника → passthrough (без поломок) |
| Встроенные типы Claude | `Explore`, `Plan`, `general-purpose` → никогда не перехватываются |
| Простые промпты | Без диспетчеризации агентов, нулевые накладные расходы |
| `agentcrow off` | Полностью отключён, всё сохранено |

---

## 🏗️ Архитектура

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (ручная работа)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 унифицированных .md файлов
  ├── catalog-index.json    Предварительно собран для поиска <5мс
  └── history.json          Записи диспетчеризации (последние 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Участие в разработке

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Лицензия

MIT

---

<p align="center">
  <b>🐦 Каждый субагент заслуживает персону.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
