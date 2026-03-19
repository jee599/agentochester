# auto-agent-router (agr)

181 agents, auto-decompose prompts, dispatch subagents in Claude Code.

## Install

```bash
npm install -g auto-agent-router
```

Or use directly:

```bash
npx auto-agent-router init
```

## Usage

### Set up agents in your project

```bash
agr init
```

This will:
- Copy 181 agent definitions to `.agr/agents/`
- Generate `.claude/CLAUDE.md` with auto-dispatch instructions
- Add `.agr/` to `.gitignore`

After init, run `claude` and it will automatically decompose complex prompts and dispatch specialized subagents.

### List all agents

```bash
agr agents
```

### Search agents

```bash
agr agents search frontend
agr agents search game
agr agents search security
```

### Dry-run prompt decomposition

```bash
agr compose "React로 로그인 페이지 만들고 테스트해줘"
```

Shows which agents would be dispatched without actually running them.

## Agent Sources

- **Builtin (9)**: Custom agents — Korean tech writer, QA engineer, security auditor, refactoring specialist, etc.
- **External (172)**: [agency-agents](https://github.com/AgencyAI/agency-agents) — engineering, design, game-development, marketing, product, testing, and more.

## How it works

1. `agr init` copies agent definitions + generates CLAUDE.md in your project
2. When you run `claude`, it reads CLAUDE.md and knows how to dispatch agents
3. Complex prompts are automatically decomposed into tasks
4. Each task is matched to the best agent and dispatched as a subagent

## Project Structure

```
├── src/
│   ├── cli.ts            # CLI entry point (agr command)
│   └── core/             # Core engine
│       ├── types.ts
│       ├── adapter.ts
│       ├── catalog.ts
│       ├── agent-manager.ts
│       ├── assembler.ts
│       ├── bridge.ts
│       └── executor.ts
├── agents/
│   ├── builtin/          # 9 custom YAML agents
│   └── external/agency-agents/  # 172 agents (git submodule)
├── templates/
│   └── CLAUDE.md.template
├── dashboard/            # Next.js dashboard (separate)
└── tests/                # Vitest tests
```

## License

MIT
