<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Jeder Subagent, den Claude erzeugt, erhält eine Experten-Persona — automatisch.<br>
  150 Agenten. Hook-erzwungen. Keine Konfiguration.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> •
  <a href="#quickstart">Schnellstart</a> •
  <a href="#how-it-works">Funktionsweise</a> •
  <a href="#commands">Befehle</a> •
  <a href="#agents">Agenten</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## Das Problem

Wenn Claude Code einen Subagenten erzeugt, ist dieser ein **leerer Generalist**. Keine Expertise, keine Regeln, keine Persönlichkeit. Er erledigt, was du verlangst, aber nicht *wie ein Spezialist es tun würde*.

```
Du: "Baue ein SaaS mit Authentifizierung, Tests und Dokumentation"

Claude erzeugt 4 Subagenten:
  Agent 1: (leer) → schreibt Auth-Code
  Agent 2: (leer) → schreibt Tests
  Agent 3: (leer) → schreibt Dokumentation
  Agent 4: (leer) → schreibt UI

  = generischer Output
  = keine Coding-Standards
  = kein Spezialwissen angewendet
```

AgentCrow löst dieses Problem. Ein **PreToolUse Hook** fängt jeden Agent-Tool-Aufruf ab und injiziert die richtige Experten-Persona — bevor der Subagent überhaupt startet:

```
Du: derselbe Prompt

AgentCrow fängt jeden Agent-Tool-Aufruf ab:
  Agent 1: → 🏗️ Backend-Architekt-Persona injiziert
            "Paranoid bei Datenintegrität. Deployed nie ohne Migrationen."
  Agent 2: → 🧪 QA-Engineer-Persona injiziert
            "Behandelt 'funktioniert wahrscheinlich' als persönliche Beleidigung."
  Agent 3: → 📝 Technical-Writer-Persona injiziert
            "Jeder Satz verdient seinen Platz."
  Agent 4: → 🖥️ Frontend-Entwickler-Persona injiziert
            "Komposition über Vererbung, immer."

  = Spezialisten-Output
  = MUST/MUST NOT Regeln durchgesetzt
  = konkrete Deliverables definiert
```

**Kein anderes Tool macht das.** Nicht ECC (100K⭐), nicht agency-agents (59K⭐), nicht wshobson (31K⭐). AgentCrow ist das einzige Tool, das Persona-Injektion auf Hook-Ebene erzwingt.

---

<a id="quickstart"></a>
## ⚡ Schnellstart

```bash
npm i -g agentcrow
agentcrow init --global
```

Das war's. Zwei Befehle. Ab jetzt:
- Komplexer Prompt → Claude zerlegt in Aufgaben → erzeugt Subagenten
- Jeder Subagent → AgentCrows Hook fängt ab → injiziert Experten-Persona
- Der Subagent arbeitet als Spezialist, nicht als Generalist

> [!TIP]
> Englische Nutzer: `agentcrow init --global --lang en`
> 한국어: `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Funktionsweise

```
Dein Prompt: "Baue eine Todo-App mit Auth, Tests und Docs"
                    │
                    ▼
  Claude zerlegt in 4 Aufgaben
                    │
                    ▼
  Claude ruft das Agent-Tool auf:
    { name: "qa_engineer", prompt: "Schreibe E2E-Tests" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (automatisch)          │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Lädt catalog-index.json (~5ms)    │
  │    2. Sucht "qa_engineer" → exakter Match│
  │    3. Lädt QA-Engineer-Persona          │
  │    4. Stellt via updatedInput voran     │
  └─────────────────────────────────────────┘
                    │
                    ▼
  Subagent startet mit vollständiger Persona:
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

    Write E2E tests    ← Original-Prompt bleibt erhalten
```

### Drei Matching-Strategien

| Priorität | Strategie | Beispiel |
|-----------|----------|---------|
| 1 | Exakte Namensübereinstimmung | `name: "qa_engineer"` → QA Engineer |
| 2 | Subagent-Typ-Übereinstimmung | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Keyword + Synonym Fuzzy | `"kubernetes helm deploy"` → DevOps Automator |

Fuzzy-Matching verwendet eine **Synonym-Map** (50+ Einträge) und **Verlaufslernen** — häufig genutzte Agenten erhalten höhere Matching-Priorität.

Integrierte Claude-Typen (`Explore`, `Plan`, `general-purpose`) werden nie abgefangen.

---

## 👀 Vorher / Nachher

<table>
<tr>
<td width="50%">

**❌ Ohne AgentCrow**
```
Claude erzeugt leeren Subagenten:
  prompt: "Schreibe Tests für Auth"

  Ergebnis:
  - Generische Testdatei
  - Keine AAA-Struktur
  - Edge Cases übersprungen
  - Keine Coverage-Ziele
  - 15 Minuten mittelmäßiger Output
```

</td>
<td width="50%">

**✅ Mit AgentCrow**
```
AgentCrow injiziert QA-Persona:
  prompt: <AGENTCROW_PERSONA>
    MUST: jede öffentliche Funktion testen
    MUST NOT: keine Implementierungsdetails testen
    Deliverables: Unit + Integration + E2E
  </AGENTCROW_PERSONA>
  Schreibe Tests für Auth

  Ergebnis:
  - AAA-strukturierte Tests
  - Happy Path + Edge + Error abgedeckt
  - Coverage-Report enthalten
  - CI-Konfiguration generiert
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Befehle

```bash
# Installation & Setup
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Lebenszyklus
agentcrow on / off [--global]   # Aktivieren/Deaktivieren
agentcrow status                # Installation prüfen
agentcrow doctor                # 12-Punkte-Diagnose
agentcrow update                # Neueste Agenten abrufen
agentcrow uninstall             # Saubere Deinstallation

# Agenten-Verwaltung
agentcrow agents                # Alle 150 Agenten auflisten
agentcrow agents search <query> # Keyword-Suche
agentcrow add <path|url>        # Benutzerdefinierten Agenten hinzufügen (.md/.yaml)
agentcrow remove <role>         # Benutzerdefinierten Agenten entfernen

# Inspektion & Debug
agentcrow compose <prompt>      # Zerlegung vorschauen (Dry Run)
agentcrow stats                 # Dispatch-Verlauf & Analytics
agentcrow inject                # Hook-Handler (intern)

# MCP-Server
agentcrow serve                 # MCP-Server starten (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Agenten

### 14 handgefertigte integrierte Agenten

Jeder integrierte Agent hat Persönlichkeit, Kommunikationsstil, Denkmodell, MUST/MUST NOT Regeln, Deliverables und Erfolgsmetriken.

| Agent | Funktion | Kernregel |
|-------|----------|-----------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Komposition über Vererbung, immer" |
| **Backend Architect** | API-Design, Auth, Datenbank, Caching | "Deployed nie ohne Migrationen" |
| **QA Engineer** | Unit-/Integrations-/E2E-Tests, Coverage | "Ungetesteter Code ist fehlerhafter Code" |
| **Security Auditor** | OWASP, CVSS-Bewertung, PoC für jeden Fund | "Sagt nie 'der Code ist sicher'" |
| **UI Designer** | Design-Systeme, Tokens, Spacing-Skalen | "Was nicht im Token-System ist, existiert nicht" |
| **DevOps Automator** | CI/CD, Docker, K8s, Secrets-Management | "Keine :latest Tags in Produktion" |
| **AI Engineer** | LLM-Integration, RAG, Prompt-Optimierung | "LLMs sind unzuverlässige Komponenten, die Guardrails brauchen" |
| **Refactoring Specialist** | Code Smells, Fowler-Katalog, Strangler Fig | "Nie refactorn ohne Tests" |
| **Complexity Critic** | Zyklomatische Komplexität, YAGNI-Durchsetzung | "Nie etwas komplex nennen ohne Beweis" |
| **Data Pipeline Engineer** | ETL, Idempotenz, Schema-Migrationen | "Idempotenz ist nicht verhandelbar" |
| **Technical Writer** | API-Docs, Guides, READMEs | "Jeder Satz verdient seinen Platz" |
| **Translator** | i18n, Locale-Dateien, technische Übersetzung | "Nie Code-Bezeichner übersetzen" |
| **Compose Meta-Reviewer** | Agenten-Team-Zusammensetzungen auditieren | "Ausführung unter Score 70 blockieren" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Keine Schadensberechnung in GameplayAbilities" |

### 136 externe Agenten (13 Abteilungen)

Von [agency-agents](https://github.com/msitarzewski/agency-agents): engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Benutzerdefinierte Agenten

```bash
agentcrow add ./my-agent.yaml           # Lokale Datei
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Entfernen (nur benutzerdefinierte)
```

---

## 🔌 MCP-Server (Optional)

```bash
agentcrow init --global --mcp
```

Fügt 3 Tools zu Claude Code hinzu: `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude kann den Agenten-Katalog programmatisch abfragen.

---

## 📊 Statistiken

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← Name direkt übereinstimmend
    fuzzy   7 (15%)    ← Keyword + Synonym übereinstimmend
    none    2 (4%)     ← kein Match, Passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Sicherheit & Performance

| | |
|:---|:---|
| Hook-Latenz | **< 50ms** pro Agent-Tool-Aufruf |
| Token-Overhead | **~350 Tokens** pro Persona-Injektion |
| Fail-open | Fehlender Index oder Binary → Passthrough (kein Bruch) |
| Claude-Builtin-Typen | `Explore`, `Plan`, `general-purpose` → nie abgefangen |
| Einfache Prompts | Kein Agenten-Dispatch, null Overhead |
| `agentcrow off` | Vollständig deaktiviert, alles gesichert |

---

## 🏗️ Architektur

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (handgefertigt)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 vereinheitlichte .md Dateien
  ├── catalog-index.json    Vorgebaut für <5ms Lookup
  └── history.json          Dispatch-Aufzeichnungen (letzte 1000)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Mitwirken

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Lizenz

MIT

---

<p align="center">
  <b>🐦 Jeder Subagent verdient eine Persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
