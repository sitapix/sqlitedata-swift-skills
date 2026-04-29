# Contributing

Optimize this repo for the people installing skills. Keep entry points obvious and the layout predictable.

## Repo Layout

- `skills/`: one directory per skill (`SKILL.md` plus optional `references/` sidecars)
- `.claude-plugin/`: marketplace metadata
- `.github/`: CI workflows and contributor docs

## Editing Rules

- Skill directory name must match the `name:` value in its `SKILL.md` frontmatter.
- When adding a sidecar reference, put it under `skills/<skill>/references/` and link from `SKILL.md` with a relative path.
- Bump the version in `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` together.
- Add a CHANGELOG entry for every release.

## Filing Issues

Use the templates in `.github/ISSUE_TEMPLATE/`. Include the SQLiteData version, the affected skill, and a minimal reproduction.
