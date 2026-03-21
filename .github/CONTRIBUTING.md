# Contributing

This repository is packaged for skill consumers first. Keep user-facing entry points obvious, generated artifacts current, and packaging behavior predictable.

## Repo Layout

- `skills/` contains installable skills
- `agents/` contains optional specialist agents
- `.agents/` mirrors the collection for Agent Skills discovery
- `.claude-plugin/` contains marketplace metadata
- `tooling/scripts/` contains validation, generation, and packaging helpers
- `Sources/` contains the Swift package
- `Tests/` contains the Swift test suite
- `Examples/` contains example apps

## Local Setup

```bash
python3 tooling/scripts/dev/tasks.py setup
```

That installs validation tools and the repo Git hooks.

## Prerequisites

- `python3`
- `uv`

`python3 tooling/scripts/dev/tasks.py setup` installs the validation tools that the hooks rely on.
It also configures `core.hooksPath` to use the repo's `.githooks/` directory.

## Daily Workflow

For normal work, after initial setup:

```bash
git add ...
git commit
git push
```

You should not need to run extra validation commands before every push unless you want a manual check.

The Git hooks already do it:

- pre-commit runs `python3 tooling/scripts/dev/tasks.py check`
- pre-push runs `python3 tooling/scripts/dev/tasks.py check`

Both of those paths run Python scripts as part of validation, so Python is a normal part of the repo workflow.

If you want to run the main validation manually before committing:

```bash
python3 tooling/scripts/dev/tasks.py check
```

For a faster style and hygiene pass:

```bash
python3 tooling/scripts/dev/tasks.py lint
```

## Common Commands

```bash
python3 tooling/scripts/dev/tasks.py lint
python3 tooling/scripts/dev/tasks.py check
python3 tooling/scripts/dev/tasks.py skills:freshness
python3 tooling/scripts/dev/tasks.py version:set -- X.Y.Z
```

- `lint` runs the repo hygiene checks and skill-description linting
- `check` runs lint, plugin validation, and description dataset checks
- `skills:freshness` reports which skills may be stale
- `version:set` updates versions across all manifests

## Editing Rules

- Keep versions aligned across `claude-code.json`, `.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`
- Prefer focused skills and clear routing over large catch-all documents

## Releases

Use:

```bash
python3 tooling/scripts/dev/tasks.py version:set -- X.Y.Z
```

That updates the consumer-facing manifests together.
