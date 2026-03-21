# AGENTS.md

This repository is the SQLiteData workspace. It ships SQLiteData skills (for Point-Free's SwiftData replacement) across multiple surfaces: direct Agent Skills discovery, Claude plugin packaging, and the Swift package itself. Keep the package small, predictable, and easy to validate.

## Structure

- Product surface: [`skills/`](sqlite-data/skills), [`commands/`](sqlite-data/commands), [`agents/`](sqlite-data/agents), [`.agents/`](sqlite-data/.agents), and [`.claude-plugin/`](sqlite-data/.claude-plugin)
- Swift package: [`Sources/`](sqlite-data/Sources), [`Tests/`](sqlite-data/Tests), [`Examples/`](sqlite-data/Examples), [`Package.swift`](sqlite-data/Package.swift)
- Support infrastructure: [`tooling/scripts/`](sqlite-data/tooling/scripts), [`tooling/tests/`](sqlite-data/tooling/tests), [`tooling/config/`](sqlite-data/tooling/config), [`tooling/hooks/`](sqlite-data/tooling/hooks), and [`tooling/evals/`](sqlite-data/tooling/evals)

## Conventions

- One skill per directory, with the directory name matching the skill `name` in front matter.
- Every skill must have Agent Skills front matter with `name`, `description`, and `license`.
- Skill descriptions should use trigger phrasing such as `Use when...`, not label-style summaries.
- Custom per-skill fields belong under `metadata`, not as extra top-level front matter keys.
- Broad SQLiteData requests should route through [`sqlitedata-swift`](sqlite-data/skills/sqlitedata-swift/SKILL.md).
- When linking to another skill inside content, use `/skill skill-name`.
- Prefer focused reference or diagnostic skills over giant catch-all documents.
- If a skill grows too large, add a short decision summary near the top or split it.
- Keep examples concrete and SQLiteData-specific.

## When Adding A Skill

1. Create `skills/<skill-name>/SKILL.md`.
2. Add front matter that matches the directory name.
3. Link it from [`sqlitedata-swift`](sqlite-data/skills/sqlitedata-swift/SKILL.md) if it should be discoverable from the router.
4. Update [`README.md`](sqlite-data/README.md) if the new skill is an important public entry point.
5. Run `python3 tooling/scripts/dev/tasks.py setup`.
6. Run `python3 tooling/scripts/quality/validate_plugin.py`.
7. Run `python3 tooling/scripts/dev/tasks.py descriptions:dataset`.

## When Changing Packaging

- Keep `.agents/skills` and `.agents/agents` resolving to the source directories so Agent Skills clients can discover the repo directly.
- Keep versions aligned across [`claude-code.json`](sqlite-data/claude-code.json), [`.claude-plugin/plugin.json`](sqlite-data/.claude-plugin/plugin.json), and [`.claude-plugin/marketplace.json`](sqlite-data/.claude-plugin/marketplace.json).
- Do not add generated indexes unless they are validated in CI.
- Avoid adding runtime dependencies for simple validation tasks.

## Review Standard

Public-facing packaging quality matters here:

- installation should be obvious
- naming should be consistent
- entry points should be clear
- routing should not rely on hidden tribal knowledge
- validation should fail fast when metadata drifts
