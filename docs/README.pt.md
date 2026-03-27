<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Cada subagente que o Claude gera recebe uma persona especialista — automaticamente.<br>
  150 agentes. Aplicado por Hook. Zero configuração.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Problema</a> •
  <a href="#quickstart">Início rápido</a> •
  <a href="#how-it-works">Como funciona</a> •
  <a href="#commands">Comandos</a> •
  <a href="#agents">Agentes</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## O problema

Quando o Claude Code gera um subagente, ele é um **generalista em branco**. Sem expertise, sem regras, sem personalidade. Faz o que você pediu, mas não *como um especialista faria*.

```
Você: "Construa um SaaS com autenticação, testes e documentação"

Claude gera 4 subagentes:
  Agent 1: (vazio) → escreve código de autenticação
  Agent 2: (vazio) → escreve testes
  Agent 3: (vazio) → escreve documentação
  Agent 4: (vazio) → escreve UI

  = output genérico
  = sem padrões de código
  = sem conhecimento especializado
```

AgentCrow resolve isso. Um **PreToolUse Hook** intercepta cada chamada ao Agent tool e injeta a persona especialista correta — antes mesmo do subagente iniciar:

```
Você: mesmo prompt

AgentCrow intercepta cada chamada ao Agent tool:
  Agent 1: → 🏗️ Persona de Arquiteto Backend injetada
            "Paranoico com integridade de dados. Nunca faz deploy sem migrações."
  Agent 2: → 🧪 Persona de Engenheiro QA injetada
            "Trata 'provavelmente funciona' como insulto pessoal."
  Agent 3: → 📝 Persona de Escritor Técnico injetada
            "Cada frase conquista seu lugar."
  Agent 4: → 🖥️ Persona de Desenvolvedor Frontend injetada
            "Composição sobre herança, sempre."

  = output de especialista
  = regras MUST/MUST NOT aplicadas
  = entregáveis concretos definidos
```

**Nenhuma outra ferramenta faz isso.** Nem ECC (100K⭐), nem agency-agents (59K⭐), nem wshobson (31K⭐). AgentCrow é a única ferramenta que aplica injeção de persona no nível do Hook.

---

<a id="quickstart"></a>
## ⚡ Início rápido

```bash
npm i -g agentcrow
agentcrow init --global
```

Pronto. Dois comandos. A partir de agora:
- Prompt complexo → Claude decompõe em tarefas → gera subagentes
- Cada subagente → Hook do AgentCrow intercepta → injeta persona especialista
- O subagente trabalha como especialista, não como generalista

> [!TIP]
> Usuários em inglês: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Como funciona

```
Seu prompt: "Construa um app de tarefas com auth, testes e docs"
                    │
                    ▼
  Claude decompõe em 4 tarefas
                    │
                    ▼
  Claude chama o Agent tool:
    { name: "qa_engineer", prompt: "Escreva testes E2E" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (automático)           │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Carrega catalog-index.json (~5ms) │
  │    2. Busca "qa_engineer" → match exato │
  │    3. Carrega persona do QA Engineer    │
  │    4. Prefixa no prompt via updatedInput│
  └─────────────────────────────────────────┘
                    │
                    ▼
  Subagente inicia com persona completa:
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

    Write E2E tests    ← prompt original preservado
```

### Três estratégias de correspondência

| Prioridade | Estratégia | Exemplo |
|-----------|-----------|---------|
| 1 | Correspondência exata por nome | `name: "qa_engineer"` → QA Engineer |
| 2 | Correspondência por tipo de subagente | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Fuzzy por palavra-chave + sinônimo | `"kubernetes helm deploy"` → DevOps Automator |

A correspondência fuzzy usa um **mapa de sinônimos** (50+ entradas) e **aprendizado do histórico** — agentes que você usa com frequência ganham maior prioridade.

Tipos integrados do Claude (`Explore`, `Plan`, `general-purpose`) nunca são interceptados.

---

## 👀 Antes / Depois

<table>
<tr>
<td width="50%">

**❌ Sem AgentCrow**
```
Claude gera subagente vazio:
  prompt: "Escreva testes para auth"

  Resultado:
  - Arquivo de teste genérico
  - Sem estrutura AAA
  - Casos limite ignorados
  - Sem metas de cobertura
  - 15 minutos de output medíocre
```

</td>
<td width="50%">

**✅ Com AgentCrow**
```
AgentCrow injeta persona QA:
  prompt: <AGENTCROW_PERSONA>
    MUST: testar cada função pública
    MUST NOT: não testar detalhes de implementação
    Deliverables: unitários + integração + E2E
  </AGENTCROW_PERSONA>
  Escreva testes para auth

  Resultado:
  - Testes com estrutura AAA
  - Happy path + edge + error cobertos
  - Relatório de cobertura incluído
  - Configuração CI gerada
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Comandos

```bash
# Instalação & Configuração
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Ciclo de vida
agentcrow on / off [--global]   # Habilitar/desabilitar
agentcrow status                # Verificar instalação
agentcrow doctor                # Diagnóstico de 12 pontos
agentcrow update                # Obter agentes mais recentes
agentcrow uninstall             # Remoção limpa

# Gestão de agentes
agentcrow agents                # Listar todos os 150 agentes
agentcrow agents search <query> # Busca por palavra-chave
agentcrow add <path|url>        # Adicionar agente personalizado (.md/.yaml)
agentcrow remove <role>         # Remover agente personalizado

# Inspeção & Debug
agentcrow compose <prompt>      # Preview da decomposição (dry run)
agentcrow stats                 # Histórico de despacho & analytics
agentcrow inject                # Handler do Hook (interno)

# Servidor MCP
agentcrow serve                 # Iniciar servidor MCP (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Agentes

### 14 Agentes integrados feitos à mão

Cada agente integrado tem personalidade, estilo de comunicação, modelo de pensamento, regras MUST/MUST NOT, entregáveis e métricas de sucesso.

| Agente | Função | Regra chave |
|--------|--------|-------------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Composição sobre herança, sempre" |
| **Backend Architect** | Design de API, auth, banco de dados, cache | "Nunca faz deploy sem migrações" |
| **QA Engineer** | Testes unitários/integração/E2E, cobertura | "Código não testado é código quebrado" |
| **Security Auditor** | OWASP, pontuação CVSS, PoC para cada achado | "Nunca diz 'o código é seguro'" |
| **UI Designer** | Sistemas de design, tokens, escalas de espaçamento | "Se não está no sistema de tokens, não existe" |
| **DevOps Automator** | CI/CD, Docker, K8s, gestão de secrets | "Sem tags :latest em produção" |
| **AI Engineer** | Integração LLM, RAG, otimização de prompts | "LLMs são componentes não confiáveis que precisam de guardrails" |
| **Refactoring Specialist** | Code smells, catálogo Fowler, strangler fig | "Nunca refatorar sem testes" |
| **Complexity Critic** | Complexidade ciclomática, aplicação de YAGNI | "Nunca chamar algo de complexo sem prova" |
| **Data Pipeline Engineer** | ETL, idempotência, migrações de schema | "Idempotência não é negociável" |
| **Technical Writer** | Docs de API, guias, READMEs | "Cada frase conquista seu lugar" |
| **Translator** | i18n, arquivos locale, tradução técnica | "Nunca traduzir identificadores de código" |
| **Compose Meta-Reviewer** | Auditar composições de equipes de agentes | "Bloquear execução abaixo da pontuação 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Sem cálculo de dano em GameplayAbilities" |

### 136 Agentes externos (13 divisões)

De [agency-agents](https://github.com/msitarzewski/agency-agents): engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Agentes personalizados

```bash
agentcrow add ./my-agent.yaml           # Arquivo local
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Remover (apenas personalizados)
```

---

## 🔌 Servidor MCP (Opcional)

```bash
agentcrow init --global --mcp
```

Adiciona 3 ferramentas ao Claude Code: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. O Claude pode consultar o catálogo de agentes programaticamente.

---

## 📊 Estatísticas

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← nome correspondeu diretamente
    fuzzy   7 (15%)    ← palavra-chave + sinônimo
    none    2 (4%)     ← sem correspondência, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Segurança & Performance

| | |
|:---|:---|
| Latência do Hook | **< 50ms** por chamada ao Agent tool |
| Overhead de tokens | **~350 tokens** por injeção de persona |
| Fail-open | Índice ou binário ausente → passthrough (sem quebra) |
| Tipos integrados do Claude | `Explore`, `Plan`, `general-purpose` → nunca interceptados |
| Prompts simples | Sem despacho de agentes, zero overhead |
| `agentcrow off` | Completamente desabilitado, tudo com backup |

---

## 🏗️ Arquitetura

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (feitos à mão)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 arquivos .md unificados
  ├── catalog-index.json    Pré-construído para busca <5ms
  └── history.json          Registros de despacho (últimos 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Contribuindo

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Licença

MIT

---

<p align="center">
  <b>🐦 Cada subagente merece uma persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
