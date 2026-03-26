# AGENTS.md

This repository is the SQLiteData Skills workspace — a Claude Code plugin and MCP server providing SQLiteData expertise (Point-Free's SwiftData replacement). The upstream Swift library is at [pointfreeco/sqlite-data](https://github.com/pointfreeco/sqlite-data).

## Architecture

SQLiteData Skills uses a two-tier delivery model to keep AI context clean:

- **3 registered skills** load inline in Claude Code for routing, core patterns, and debugging
- **1 domain agent** (sqlitedata-reference) bundles the other 5 skills into an isolated-context reference lookup
- **MCP server** serves all 8 skills for non-Claude clients

The domain agent is a generated file. Edit the source skill in `skills/*/SKILL.md` and rebuild with `node scripts/build-agents.mjs`.

## Structure

- Skills: `skills/` (8 skills), `commands/` (ask, audit), `agents/` (sqlitedata-reference)
- MCP server: `mcp-server/` (4 tools, 8 resources, 2 prompts)
- Tooling: `tooling/scripts/`, `tooling/tests/`, `tooling/config/`, `tooling/evals/`
- Hooks: `hooks/` (session-start, error-nudge, prompt-detect, guardrails)

**Registered skills** (loaded inline):
- `sqlitedata-swift` — router
- `sqlitedata-swift-core` — @Table, @FetchAll, migrations, database setup
- `sqlitedata-swift-diag` — errors, debugging, troubleshooting

**Agent-backed skills** (run in isolated context via sqlitedata-reference):
- `sqlitedata-swift-ref`, `sqlitedata-swift-cloudkit`, `sqlitedata-swift-cloudkit-setup`, `sqlitedata-swift-sharing-ref`, `sqlitedata-swift-swiftdata-sync`

## When Adding a Skill

1. Create `skills/<skill-name>/SKILL.md` with front matter matching the directory name.
2. Add a catalog entry in `skills/catalog.json`.
3. Add it to the domain agent in `scripts/build-agents.mjs`.
4. Run `node scripts/build-agents.mjs` to regenerate the agent file.
5. If the skill should be a registered entry point (rare — only 3 today), add it to `plugin.json` and update the router.
6. Run `python3 tooling/scripts/dev/tasks.py check`.

## Hooks and Validation

- **pre-commit** (~2s): rebuilds agent, stages, lint + staleness check
- **pre-push**: full `python3 tooling/scripts/dev/tasks.py check` — lint, agents:check, plugin validation, description evals, unit tests
- **CI** (validate.yml): runs tasks.py check on every push and PR

## Common Commands

```bash
python3 tooling/scripts/dev/tasks.py setup          # bootstrap
python3 tooling/scripts/dev/tasks.py check           # full validation
python3 tooling/scripts/dev/tasks.py lint             # fast style check
python3 tooling/scripts/dev/tasks.py agents:build     # rebuild domain agent
python3 tooling/scripts/dev/tasks.py agents:check     # verify agent matches source
python3 tooling/scripts/dev/tasks.py version:set X.Y.Z
python3 tooling/scripts/dev/tasks.py release -- X.Y.Z # one-command release
```

## Releasing

```bash
python3 tooling/scripts/dev/tasks.py release -- X.Y.Z
```

Bumps version, rebuilds agent, validates, commits, tags, and pushes.
