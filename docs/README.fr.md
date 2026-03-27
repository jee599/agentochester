<h1 align="center">
  <br>
  🐦 AgentCrow
  <br>
</h1>

<h3 align="center">
  Chaque sous-agent que Claude génère reçoit un persona d'expert — automatiquement.<br>
  150 agents. Appliqué par Hook. Zéro configuration.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/agentcrow"><img src="https://img.shields.io/npm/v/agentcrow?style=flat-square&color=violet" alt="npm" /></a>
  <img src="https://img.shields.io/badge/agents-150-brightgreen?style=flat-square" alt="Agents" />
  <img src="https://img.shields.io/badge/tests-187_passing-brightgreen?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/hook-PreToolUse-blue?style=flat-square" alt="Hook" />
  <a href="LICENSE"><img src="https://img.shields.io/github/license/jee599/agentcrow?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#the-problem">Problème</a> •
  <a href="#quickstart">Démarrage rapide</a> •
  <a href="#how-it-works">Fonctionnement</a> •
  <a href="#commands">Commandes</a> •
  <a href="#agents">Agents</a> •
  <a href="../README.md">English</a> •
  <a href="README.ko.md">한국어</a> •
  <a href="README.ja.md">日本語</a>
</p>

---

<a id="the-problem"></a>
## Le problème

Quand Claude Code génère un sous-agent, c'est un **généraliste vide**. Pas d'expertise, pas de règles, pas de personnalité. Il fait ce que vous demandez, mais pas *comme un spécialiste le ferait*.

```
Vous : "Construis un SaaS avec authentification, tests et documentation"

Claude génère 4 sous-agents :
  Agent 1 : (vide) → écrit le code d'auth
  Agent 2 : (vide) → écrit les tests
  Agent 3 : (vide) → écrit la documentation
  Agent 4 : (vide) → écrit l'UI

  = output générique
  = aucun standard de code
  = aucune expertise spécialisée
```

AgentCrow résout ce problème. Un **PreToolUse Hook** intercepte chaque appel au Agent tool et injecte le bon persona d'expert — avant même que le sous-agent ne démarre :

```
Vous : même prompt

AgentCrow intercepte chaque appel au Agent tool :
  Agent 1 : → 🏗️ Persona d'Architecte Backend injecté
             "Paranoïaque sur l'intégrité des données. Ne déploie jamais sans migrations."
  Agent 2 : → 🧪 Persona d'Ingénieur QA injecté
             "Traite 'ça marche probablement' comme une insulte personnelle."
  Agent 3 : → 📝 Persona de Rédacteur Technique injecté
             "Chaque phrase mérite sa place."
  Agent 4 : → 🖥️ Persona de Développeur Frontend injecté
             "Composition plutôt qu'héritage, toujours."

  = output de spécialiste
  = règles MUST/MUST NOT appliquées
  = livrables concrets définis
```

**Aucun autre outil ne fait ça.** Ni ECC (100K⭐), ni agency-agents (59K⭐), ni wshobson (31K⭐). AgentCrow est le seul outil qui impose l'injection de persona au niveau du Hook.

---

<a id="quickstart"></a>
## ⚡ Démarrage rapide

```bash
npm i -g agentcrow
agentcrow init --global
```

C'est tout. Deux commandes. À partir de maintenant :
- Prompt complexe → Claude décompose en tâches → génère des sous-agents
- Chaque sous-agent → le Hook d'AgentCrow intercepte → injecte le persona expert
- Le sous-agent travaille en spécialiste, pas en généraliste

> [!TIP]
> Utilisateurs anglophones : `agentcrow init --global --lang en`
> 한국어 : `agentcrow init --global --lang ko`

---

<a id="how-it-works"></a>
## ⚙️ Fonctionnement

```
Votre prompt : "Construis une app de tâches avec auth, tests et docs"
                    │
                    ▼
  Claude décompose en 4 tâches
                    │
                    ▼
  Claude appelle l'Agent tool :
    { name: "qa_engineer", prompt: "Écris des tests E2E" }
                    │
                    ▼
  ┌─────────────────────────────────────────┐
  │  PreToolUse Hook (automatique)          │
  │                                         │
  │  agentcrow-inject.sh → agentcrow inject │
  │    1. Charge catalog-index.json (~5ms)  │
  │    2. Cherche "qa_engineer" → match exact│
  │    3. Charge le persona QA Engineer     │
  │    4. Préfixe au prompt via updatedInput│
  └─────────────────────────────────────────┘
                    │
                    ▼
  Le sous-agent démarre avec le persona complet :
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

    Write E2E tests    ← prompt original préservé
```

### Trois stratégies de correspondance

| Priorité | Stratégie | Exemple |
|----------|----------|---------|
| 1 | Correspondance exacte par nom | `name: "qa_engineer"` → QA Engineer |
| 2 | Correspondance par type de sous-agent | `subagent_type: "security_auditor"` → Security Auditor |
| 3 | Fuzzy par mot-clé + synonyme | `"kubernetes helm deploy"` → DevOps Automator |

La correspondance fuzzy utilise une **carte de synonymes** (50+ entrées) et l'**apprentissage de l'historique** — les agents fréquemment utilisés obtiennent une priorité de correspondance plus élevée.

Les types intégrés de Claude (`Explore`, `Plan`, `general-purpose`) ne sont jamais interceptés.

---

## 👀 Avant / Après

<table>
<tr>
<td width="50%">

**❌ Sans AgentCrow**
```
Claude génère un sous-agent vide :
  prompt : "Écris des tests pour l'auth"

  Résultat :
  - Fichier de test générique
  - Pas de structure AAA
  - Cas limites ignorés
  - Pas d'objectifs de couverture
  - 15 minutes d'output médiocre
```

</td>
<td width="50%">

**✅ Avec AgentCrow**
```
AgentCrow injecte le persona QA :
  prompt : <AGENTCROW_PERSONA>
    MUST : tester chaque fonction publique
    MUST NOT : ne pas tester les détails d'implémentation
    Deliverables : unitaires + intégration + E2E
  </AGENTCROW_PERSONA>
  Écris des tests pour l'auth

  Résultat :
  - Tests structurés AAA
  - Happy path + edge + erreur couverts
  - Rapport de couverture inclus
  - Configuration CI générée
```

</td>
</tr>
</table>

---

<a id="commands"></a>
## 🔧 Commandes

```bash
# Installation & Configuration
agentcrow init [--global] [--lang en|ko] [--max 5] [--mcp]

# Cycle de vie
agentcrow on / off [--global]   # Activer/Désactiver
agentcrow status                # Vérifier l'installation
agentcrow doctor                # Diagnostic en 12 points
agentcrow update                # Récupérer les derniers agents
agentcrow uninstall             # Désinstallation propre

# Gestion des agents
agentcrow agents                # Lister les 150 agents
agentcrow agents search <query> # Recherche par mot-clé
agentcrow add <path|url>        # Ajouter un agent personnalisé (.md/.yaml)
agentcrow remove <role>         # Supprimer un agent personnalisé

# Inspection & Debug
agentcrow compose <prompt>      # Aperçu de la décomposition (dry run)
agentcrow stats                 # Historique de dispatch & analytics
agentcrow inject                # Handler du Hook (interne)

# Serveur MCP
agentcrow serve                 # Démarrer le serveur MCP (stdio)
```

---

<a id="agents"></a>
## 🤖 150 Agents

### 14 agents intégrés faits main

Chaque agent intégré possède une personnalité, un style de communication, un modèle de réflexion, des règles MUST/MUST NOT, des livrables et des métriques de succès.

| Agent | Fonction | Règle clé |
|-------|----------|-----------|
| **Frontend Developer** | React/Next.js, Core Web Vitals, WCAG AA | "Composition plutôt qu'héritage, toujours" |
| **Backend Architect** | Conception d'API, auth, base de données, cache | "Ne déploie jamais sans migrations" |
| **QA Engineer** | Tests unitaires/intégration/E2E, couverture | "Du code non testé est du code cassé" |
| **Security Auditor** | OWASP, score CVSS, PoC pour chaque découverte | "Ne dit jamais 'le code est sécurisé'" |
| **UI Designer** | Systèmes de design, tokens, échelles d'espacement | "S'il n'est pas dans le système de tokens, il n'existe pas" |
| **DevOps Automator** | CI/CD, Docker, K8s, gestion des secrets | "Pas de tags :latest en production" |
| **AI Engineer** | Intégration LLM, RAG, optimisation de prompts | "Les LLMs sont des composants peu fiables qui nécessitent des guardrails" |
| **Refactoring Specialist** | Code smells, catalogue Fowler, strangler fig | "Jamais de refactoring sans tests" |
| **Complexity Critic** | Complexité cyclomatique, application YAGNI | "Ne jamais qualifier de complexe sans preuve" |
| **Data Pipeline Engineer** | ETL, idempotence, migrations de schéma | "L'idempotence n'est pas négociable" |
| **Technical Writer** | Docs d'API, guides, READMEs | "Chaque phrase mérite sa place" |
| **Translator** | i18n, fichiers locale, traduction technique | "Ne jamais traduire les identifiants de code" |
| **Compose Meta-Reviewer** | Auditer les compositions d'équipes d'agents | "Bloquer l'exécution en dessous du score 70" |
| **Unreal GAS Specialist** | GameplayAbilitySystem, UE5 C++ | "Pas de calcul de dégâts dans GameplayAbilities" |

### 136 agents externes (13 divisions)

De [agency-agents](https://github.com/msitarzewski/agency-agents) : engineering, game-dev, design, marketing, testing, sales, support, product, strategy, spatial-computing, academic, paid-media, project-management.

---

## ➕ Agents personnalisés

```bash
agentcrow add ./my-agent.yaml           # Fichier local
agentcrow add https://example.com/a.md  # URL
agentcrow remove my_agent               # Supprimer (personnalisés uniquement)
```

---

## 🔌 Serveur MCP (Optionnel)

```bash
agentcrow init --global --mcp
```

Ajoute 3 outils à Claude Code : `agentcrow_match`, `agentcrow_search`, `agentcrow_list`. Claude peut interroger le catalogue d'agents de manière programmatique.

---

## 📊 Statistiques

```bash
agentcrow stats
```

```
  🐦 AgentCrow Stats

  Match Quality
    exact  38 (81%)    ← nom correspondant directement
    fuzzy   7 (15%)    ← mot-clé + synonyme
    none    2 (4%)     ← pas de correspondance, passthrough

  Top Agents
    frontend_developer     12 ████████████
    qa_engineer             8 ████████
    backend_architect       6 ██████
```

---

## 🛡️ Sécurité & Performance

| | |
|:---|:---|
| Latence du Hook | **< 50ms** par appel au Agent tool |
| Overhead de tokens | **~350 tokens** par injection de persona |
| Fail-open | Index ou binaire manquant → passthrough (pas de rupture) |
| Types intégrés Claude | `Explore`, `Plan`, `general-purpose` → jamais interceptés |
| Prompts simples | Pas de dispatch d'agents, zéro overhead |
| `agentcrow off` | Complètement désactivé, tout sauvegardé |

---

## 🏗️ Architecture

```
~/.agentcrow/
  ├── agents/
  │   ├── builtin/          14 YAML (faits main)
  │   ├── external/         136 MD (agency-agents)
  │   └── md/               150 fichiers .md unifiés
  ├── catalog-index.json    Pré-construit pour lookup <5ms
  └── history.json          Enregistrements de dispatch (1000 derniers)

~/.claude/
  ├── settings.json         SessionStart + PreToolUse hooks
  └── hooks/
      └── agentcrow-inject.sh
```

---

## 🤝 Contribuer

```bash
git clone https://github.com/jee599/agentcrow.git
cd agentcrow && npm install && npm test  # 187 tests
```

## 📜 Licence

MIT

---

<p align="center">
  <b>🐦 Chaque sous-agent mérite un persona.</b>
</p>

<p align="center">
  <a href="https://github.com/jee599/agentcrow">
    <img src="https://img.shields.io/badge/GitHub-⭐_Star_this_repo-yellow?style=for-the-badge&logo=github" alt="Star" />
  </a>
</p>
