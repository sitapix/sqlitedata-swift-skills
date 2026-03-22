# Contributing

This repository is packaged for skill consumers first. Keep user-facing entry points obvious, generated artifacts current, and packaging behavior predictable.

## Repo Layout

- `skills/` contains all 12 skill source files
- `agents/sqlitedata-reference.md` is a generated domain agent (built from 9 source skills by `scripts/build-agents.mjs`)
- `mcp-server/` contains the standalone MCP server
- `.agents/` mirrors skills/ and agents/ via symlinks for Agent Skills discovery
- `.claude-plugin/` contains marketplace metadata
- `tooling/` contains validation, generation, and packaging helpers

## Local Setup

```bash
python3 tooling/scripts/dev/tasks.py setup
```

That installs validation tools and the repo Git hooks.

## Prerequisites

- `python3`
- `node` (for build-agents.mjs)
- `uv`

## Daily Workflow

```bash
git add ...
git commit
git push
```

The Git hooks handle everything:

- **pre-commit** (~2s): rebuilds domain agent, stages it, runs lint + staleness check
- **pre-push**: runs full `tasks.py check` — lint, agents:check, plugin validation, description evals, unit tests

## Common Commands

```bash
python3 tooling/scripts/dev/tasks.py lint             # fast style check
python3 tooling/scripts/dev/tasks.py agents:build      # rebuild domain agent
python3 tooling/scripts/dev/tasks.py agents:check      # verify agent matches source
python3 tooling/scripts/dev/tasks.py check             # full validation
python3 tooling/scripts/dev/tasks.py skills:freshness   # staleness report
```

## Editing Rules

- Do not hand-edit `agents/sqlitedata-reference.md` — edit source skills and run `agents:build`
- Keep versions aligned — use `tasks.py version:set -- X.Y.Z` or `tasks.py release -- X.Y.Z`
- Prefer focused skills and clear routing over large catch-all documents

## Adding a Skill

1. Create `skills/<skill-name>/SKILL.md` with front matter.
2. Add a catalog entry in `skills/catalog.json`.
3. Add it to the domain agent in `scripts/build-agents.mjs`.
4. Run `node scripts/build-agents.mjs`.
5. Run `python3 tooling/scripts/dev/tasks.py check`.

## Releases

One command:

```bash
python3 tooling/scripts/dev/tasks.py release -- X.Y.Z
```

Bumps version, rebuilds agent, validates, commits, tags, and pushes.
