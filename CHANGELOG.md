# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.5.0] - Unreleased

### Added
- Modular CLI architecture (split cli.ts into commands/ and utils/)
- `agentcrow update` command
- `agentcrow doctor` command
- `agentcrow uninstall` command
- `--lang ko` option for Korean dispatch rules
- `--verbose` flag for compose

### Fixed
- VERSION read from package.json (no more dual management)
- Builtin agents now get priority over external in search scoring
- Improved error messages for compose/decompose

### Changed
- cli.ts split into modular command files

## [3.3.2] - 2025

### Changed
- Visual overhaul -- branded CLI output and dispatch format

### Fixed
- Harden CLI logic and fix test failures

### Documentation
- Update demo GIF with v3.3.2 branded output
- Regenerate demo GIF and update all localized READMEs

## [3.3.1] - 2025

### Fixed
- Harden CLI logic and fix test failures

## [3.3.0] - 2025

### Added
- Enforce agent dispatch via SessionStart hook injection
- Demo GIF in README

### Changed
- Symlink global agents instead of per-project copy

### Fixed
- Update hook format for Claude Code v2.1+ (matcher + hooks array)

## [3.2.0] - 2025

### Added
- 78 tests, 12 languages, all audit issues resolved

### Fixed
- Security and UX improvements in CLI

### Tests
- Round 3 -- strengthen coverage for edge cases

### Documentation
- Round 1 README fixes -- accuracy, links, stale content
- Add 8 more language READMEs (es/pt/de/fr/ru/hi/tr/vi) -- 12 total

## [3.1.0] - 2025

### Fixed
- All audit issues resolved
- Update all READMEs for v3.1 -- test count, global storage, no .agr

## [3.0.0] - 2025

### Added
- Agents in .claude/agents/, slim CLAUDE.md, --max N

## [2.0.0] - 2025

### Added
- Global agent storage (~/.agentcrow/) -- install once, use everywhere

### Fixed
- CLAUDE.md merge, dead code removal, English-only output
- Search no longer returns 0.1-score noise for unmatched queries

### Documentation
- README reflects global storage + CLAUDE.md merge
- Update README for v2.0 -- merge note, --lang ko, fix test count
- Reposition as essential Agent Teams companion -- comparison table
- Unique examples per language -- SaaS/coffee chat/blog/stock analysis
- Star-optimized README + ko/ja/zh translations
- Launch blog posts + social media copy

## [1.3.0] - 2025

### Added
- Auto-download 172 external agents on init
- SessionStart hook shows agent roster + CLAUDE.md shows dispatch rules
- agentcrow on/off/status + SessionStart hook

## [1.0.0] - 2025

### Added
- agentcrow CLI -- decompose prompt + match agents + launch claude
- Project CLAUDE.md -- auto agent dispatch for complex tasks
- Restructure as npm package (auto-agent-router)
- Rename to agentcrow npm package
- LLM-based smart decomposer -- Claude CLI analyzes prompts for tasks
- Orchestrator agent -- synthesizes all agent outputs into final output
- Enable tools for agent execution (Write, Edit, Read, Bash, Glob, Grep)
- Interactive agent conversations -- reply to any agent via --continue
- Interactive Terminal page -- WebSocket chat with Claude CLI
- Agent names in execution UI + completion animations
- Chain agent outputs -- each agent sees previous agents' results

### Fixed
- Simplify agent detail to 2 lines -- personality + description
- Use OAuth auth for claude CLI (remove ANTHROPIC_API_KEY from env)
- Remove --dangerously-skip-permissions -- use plain print mode
- Instruct agents to not ask questions -- decide and execute directly
- Pass prompt via stdin to claude CLI (--allowedTools eats positional args)
- Complete all i18n translations -- 91 keys x 8 languages
- Auto-start agent execution + loading spinner

### Changed
- Single claude session for team execution
