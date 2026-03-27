<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Cada subagente que Claude genera recibe una persona experta — automáticamente.<br>
  150 agentes. Aplicado por Hook. Cero configuración.
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
  <a href="#quickstart">Inicio rápido</a> •
  <a href="#how-it-works">Cómo funciona</a> •
  <a href="#commands">Comandos</a> •
  <a href="#agents">Agentes</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## El problema

Cuando Claude Code genera un subagente, es un **generalista en blanco**. Sin experiencia, sin reglas, sin personalidad. Hace lo que le pides, pero no *como lo haría un especialista*.

```
Tú: "Construye un SaaS con autenticación, tests y documentación"

Claude genera 4 subagentes:
  Agent 1: (vacío) → escribe código de autenticación
  Agent 2: (vacío) → escribe tests
  Agent 3: (vacío) → escribe documentación
  Agent 4: (vacío) → escribe UI

  = output genérico
  = sin estándares de código
  = sin conocimiento especializado
```

AgentCrow resuelve esto. Un **PreToolUse Hook** intercepta cada llamada al Agent tool e inyecta la persona experta correcta — antes de que el subagente siquiera arranque:

```
Tú: mismo prompt

AgentCrow intercepta cada llamada al Agent tool:
  Agent 1: → 🏗️ Persona de Arquitecto Backend inyectada
            "Paranoico con la integridad de datos. Nunca despliega sin migraciones."
  Agent 2: → 🧪 Persona de Ingeniero QA inyectada
            "Trata 'probablemente funciona' como un insulto personal."
  Agent 3: → 📝 Persona de Escritor Técnico inyectada
            "Cada oración se gana su lugar."
  Agent 4: → 🖥️ Persona de Desarrollador Frontend inyectada
            "Composición sobre herencia, siempre."

  = output de especialista
  = reglas MUST/MUST NOT aplicadas
  = entregables concretos definidos
```

**Ninguna otra herramienta hace esto.** Ni ECC (100K⭐), ni agency-agents (59K⭐), ni wshobson (31K⭐). AgentCrow es la única herramienta que aplica inyección de persona a nivel de Hook.

---

<a id="quickstart"></a>
## ⚡ Inicio rápido

```bash
npm i -g agentcrow
agentcrow init --global
```

Eso es todo. Dos comandos. A partir de ahora:
- Prompt complejo → Claude descompone en tareas → genera subagentes
- Cada subagente → el Hook de AgentCrow intercepta → inyecta persona experta
- El subagente trabaja como especialista, no como generalista

> [!TIP]
> Usuarios en inglés: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Cómo funciona

```
Tu prompt: "Construye una app de tareas con auth, tests y docs"
                    │
                    ▼
  Claude descompone en 4 tareas
                    │
                    ▼
  Claude llama al Agent tool:
    { name: "qa_engineer", prompt: "Escribe tests E2E" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (automático)           │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Carga catalog-index.json (~5ms)   │
  │    2. Busca "qa_engineer" → coincidencia│
  │    3. Carga persona de QA Engineer      │
  │    4. Antepone al prompt via updatedInput│
  └─────────────────────────────────────────┘
                    │
                    ▼
  El subagente arranca con persona completa:
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

### Tres estrategias de coincidencia

| Prioridad | Estrategia | Ejemplo |
|-----------|-----------|---------|
| 1 | Coincidencia exacta por nombre | `name: "qa_engineer"` → QA Engineer |
| 2 | Coincidencia por tipo de subagente | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Fuzzy por palabra clave + sinónimo | `"kubernetes helm deploy"` → DevOps Automator |

La coincidencia fuzzy usa un **mapa de sinónimos** (50+ entradas) y **aprendizaje del historial** — los agentes que usas con frecuencia obtienen mayor prioridad.

Los tipos integrados de Claude (`Explore`, `Plan`, `general-purpose`) nunca se interceptan.

---

## 👀 Antes / Después

<table>
<tr>
<td width="50%">

**❌ Sin AgentCrow**
```
Claude genera subagente vacío:
  prompt: "Escribe tests para auth"

  Resultado:
  - Archivo de test genérico
  - Sin estructura AAA
  - Casos límite omitidos
  - Sin objetivos de cobertura
  - 15 minutos de output mediocre
```

</td>
<td width="50%">

**✅ Con AgentCrow**
```
AgentCrow inyecta persona QA:
  prompt: <AGENTCROW_PERSONA>
    MUST: testear cada función pública
    MUST NOT: no testear detalles de implementación
    Deliverables: unitarios + integración + E2E
  </AGENTCROW_PERSONA>
  Escribe tests para auth

  Resultado:
  - Tests con estructura AAA
  - Happy path + edge + error cubiertos
  - Reporte de cobertura incluido
  - Configuración CI generada
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Comandos

```bash
# Instalación & Configuración
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Ciclo de vida
agentcrow on / off [--global]   # Habilitar/deshabilitar
agentcrow status                # Verificar instalación
agentcrow doctor                # Diagnóstico de 12 puntos
agentcrow update                # Obtener últimos agentes
agentcrow uninstall             # Desinstalación limpia

# Gestión de agentes
agentcrow agents                # Listar los 150 agentes
agentcrow agents search <query> # Búsqueda por palabra clave
agentcrow add <path|url>        # Agregar agente personalizado (.md/.yaml)
agentcrow remove <role>         # Eliminar agente personalizado

# Inspección & Debug
agentcrow compose <prompt>      # Vista previa de descomposición (dry run)
agentcrow stats                 # Historial de despacho & analíticas
agentcrow inject                # Handler del Hook (interno)

# Servidor MCP
agentcrow serve                 # Iniciar servidor MCP (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Agentes

### 14 Agentes integrados hechos a mano

Cada agente integrado tiene personalidad, estilo de comunicación, modelo de pensamiento, reglas MUST/MUST NOT, entregables y métricas de éxito.

| Agente | Función | Regla clave |
|--------|---------|-------------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Composición sobre herencia, siempre" |
| **Backend Architect** | Diseño de API, auth, base de datos, caché | "Nunca despliega sin migraciones" |
| **QA Engineer** | Tests unitarios/integración/E2E, cobertura | "Código no testeado es código roto" |
| **Security Auditor** | OWASP, puntuación CVSS, PoC para cada hallazgo | "Nunca dice 'el código es seguro'" |
| **UI Designer** | Sistemas de diseño, tokens, escalas de espaciado | "Si no está en el sistema de tokens, no existe" |
| **DevOps Automator** | CI/CD, Docker, K8s, gestión de secretos | "Sin tags :latest en producción" |
| **AI Engineer** | Integración LLM, RAG, optimización de prompts | "Los LLMs son componentes poco confiables que necesitan guardarraíles" |
| **Refactoring Specialist** | Code smells, catálogo Fowler, strangler fig | "Nunca refactorizar sin tests" |
| **Complexity Critic** | Complejidad ciclomática, aplicación de YAGNI | "Nunca llamar algo complejo sin pruebas" |
| **Data Pipeline Engineer** | ETL, idempotencia, migraciones de schema | "La idempotencia no es negociable" |
| **Technical Writer** | Docs de API, guías, READMEs | "Cada oración se gana su lugar" |
| **Translator** | i18n, archivos locale, traducción técnica | "Nunca traducir identificadores de código" |
| **Compose Meta-Reviewer** | Auditar composiciones de equipos de agentes | "Bloquear ejecución por debajo de puntuación 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Sin cálculo de daño en GameplayAbilities" |

### 136 Agentes externos (13 divisiones)

De [agency-agents](https://github.com/msitarzewski/agency-agents): engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Agentes personalizados

```bash
agentcrow add ./my-agent.yaml           # Archivo local
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Eliminar (solo personalizados)
```

---

## 🔌 Servidor MCP (Opcional)

```bash
agentcrow init --global --mcp
```

Agrega 3 herramientas a Claude Code: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude puede consultar el catálogo de agentes programáticamente.

---

## 📊 Estadísticas

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← nombre coincidió directamente
    fuzzy   7 (15%)    ← palabra clave + sinónimo
    none    2 (4%)     ← sin coincidencia, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Seguridad & Rendimiento

| | |
|:---|:---|
| Latencia del Hook | **< 50ms** por llamada al Agent tool |
| Overhead de tokens | **~350 tokens** por inyección de persona |
| Fail-open | Índice o binario faltante → passthrough (sin ruptura) |
| Tipos integrados de Claude | `Explore`, `Plan`, `general-purpose` → nunca interceptados |
| Prompts simples | Sin despacho de agentes, cero overhead |
| `agentcrow off` | Completamente deshabilitado, todo respaldado |

---

## 🏗️ Arquitectura

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (hechos a mano)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 archivos .md unificados
  ├── catalog-index.json    Pre-construido para búsqueda <5ms
  └── history.json          Registros de despacho (últimos 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Contribuir

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Licencia

MIT

---

<p align="center">
  <b>🐦 Cada subagente merece una persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
