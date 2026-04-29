SQLiteData Skills is a collection of Agent Skills for [Point-Free's SQLiteData](https://github.com/pointfreeco/sqlite-data), distributed through Agent Skills discovery and the Claude Code plugin marketplace. Keep the package small and predictable.

## Structure

- `skills/`: one directory per skill, each containing `SKILL.md` and an optional `references/` folder for sidecar files
- `.claude-plugin/`: marketplace metadata
- `.github/`: CI workflows and contributor docs
- `AGENTS.md`, `CHANGELOG.md`, `LICENSE`, `README.md`: top-level docs

## Conventions

- Skill directory name matches the `name:` value in its `SKILL.md` frontmatter.
- Sidecar reference content lives in `skills/<skill>/references/*.md`. Link from `SKILL.md` using relative paths like `[name](references/name.md)`.
- Prefer focused reference or diagnostic skills over giant catch-all documents.
- Sibling sqd-* skills exist as separate units. Boundaries and overlap are deliberate. Do not merge them without a clear reason.
- Keep examples concrete and SQLiteData/GRDB/CloudKit specific.

## When Adding a Skill

1. Create `skills/<skill-name>/SKILL.md` with frontmatter matching the directory name.
2. If the skill needs sidecar reference material, add it under `skills/<skill-name>/references/`.
3. Verify the skill is discoverable by Agent Skills clients pointing at this repo.

## Review Standard

Quality bar for public packaging:

- Each skill description names specific SQLiteData / GRDB / CloudKit APIs and a concrete trigger context.
- No stale links to removed skills.
- Sample code uses current SQLiteData APIs; flag anything that drifted from the upstream library.
