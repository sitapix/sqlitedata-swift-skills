# Changelog

## 2.0.0

Breaking release. Reinstall required for v1.x users; every skill path changed.

### Renamed all 7 specialist skills from `sqlitedata-swift-*` to `sqd-*`

Skill name renames:

- `sqlitedata-swift-core` → `sqd-core`
- `sqlitedata-swift-cloudkit` → `sqd-cloudkit`
- `sqlitedata-swift-cloudkit-setup` → `sqd-cloudkit-setup`
- `sqlitedata-swift-diag` → `sqd-diag`
- `sqlitedata-swift-ref` → `sqd-ref`
- `sqlitedata-swift-sharing-ref` → `sqd-sharing`
- `sqlitedata-swift-swiftdata-sync` → `sqd-swiftdata-sync`

### Repo restructure

- Removed the `sqlitedata-swift` router skill. Specialists auto-activate from descriptions or are invoked directly.
- Removed the domain-agent layer (`sqlitedata-reference`).
- Removed the MCP server, build/validation tooling, hooks, contributor scripts, and generated catalogs. Repo is now a flat skills collection conformant with the [Vercel skills CLI](https://github.com/vercel-labs/skills).
- Plugin manifests now list all 7 specialist skills instead of 3 entry points.

### Reinstall

```sh
npx skills add sitapix/sqlitedata-swift-skills
```

Or via Claude Code:

```sh
/plugin marketplace add sitapix/sqlitedata-swift-skills
/plugin install sqlitedata-swift@sqlitedata-swift-marketplace
```

## 1.7.2

CI and packaging fixes.

## 1.7.0

Initial public release.
