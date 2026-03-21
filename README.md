# SQLiteData

Deep SQLiteData expertise for AI coding assistants. Covers @Table models, @FetchAll/@FetchOne/@Fetch wrappers, database setup, migrations, CloudKit sync via SyncEngine, and troubleshooting.

## What is SQLiteData?

SQLiteData gives AI coding assistants focused guidance on [Point-Free's SQLiteData](https://github.com/pointfreeco/sqlite-data) — a fast, lightweight SwiftData replacement powered by SQLite (GRDB) with CloudKit sync support.

- **12 focused skills** covering core patterns, CloudKit sync, API reference, diagnostics, and Apple CloudKit docs
- **1 main command** for plain-language questions plus **1 audit helper**
- **Hooks** that auto-inject routing context at session start, suggest skills on errors, and detect SQLiteData prompts

> **Status:** SQLiteData is in active development. Some routes or docs may be incomplete. If you hit a bug or something looks off, please [open an issue](https://github.com/sitapix/sqlitedata-swift-skills/issues).

## Quick Start

SQLiteData is one collection with one primary entry point and one secondary helper:

- **Claude Code plugin** for the native `/plugin` and `/sqlitedata-swift:ask` flow
- **Repo clone** for Agent Skills discovery

### 1. Add the Marketplace

```
/plugin marketplace add sitapix/sqlitedata-swift-skills
```

### 2. Install the Plugin

Use `/plugin` to open the plugin menu, search for **sqlitedata-swift**, then install it.

### 3. Verify Installation

Use `/plugin`, then open **Manage and install**. SQLiteData should be listed there.

### 4. Ask Questions

Skills are suggested automatically in Claude Code based on your question and context. Start with prompts like these:

```
"How do I set up a SQLiteData database?"
"My @FetchAll isn't updating the view"
"How do I sync with CloudKit using SyncEngine?"
"What's the difference between @FetchAll and @FetchOne?"
"My migration is failing with a constraint error"
"How do I share records with other iCloud users?"
```

The default starting point is `/sqlitedata-swift:ask`. Use it for almost everything. It routes to the right specialist skill automatically.

```
/sqlitedata-swift:ask your question here
```

You don't need to know which skill to use — just describe your problem and the router figures it out.

### 5. Audit Your Code

Scan your SQLiteData code for anti-patterns and common mistakes:

```
/sqlitedata-swift:audit
```

Use the audit helper when you explicitly want a repo scan. For normal SQLiteData help, stick with `/sqlitedata-swift:ask`.

Catches missing `prepareDependencies`, NOT NULL without default, UNIQUE constraints on synced tables, missing `@ObservationIgnored`, and more.

## Other Ways to Use SQLiteData

### Repo Clone for Agent Skills Clients

```bash
git clone https://github.com/sitapix/sqlitedata-swift-skills
cd sqlitedata-swift-skills
```

Use this path when your client can discover skills from a cloned repo or workspace.

If that client exposes commands, start with `/sqlitedata-swift:ask`. That is the intended front door.

If it only loads direct skills, open the matching skill or copy one focused skill into your local skills folder.

### Copy Specific Skills Elsewhere

```bash
mkdir -p /path/to/your/project/.agents/skills
cp -R skills/sqlitedata-swift-core /path/to/your/project/.agents/skills/
```

Or copy everything:

```bash
cp -r skills/* .claude/skills/

mkdir -p .claude/commands
cp commands/ask.md .claude/commands/sqlitedata.md
```

## Troubleshooting

- If SQLiteData does not appear after install, use `/plugin` and check **Manage and install** first.
- If `/sqlitedata-swift:ask` is unavailable, confirm the plugin is installed from the marketplace flow above.

## What's Inside

The `/sqlitedata-swift:ask` command is the main user-facing entry point. It routes your question to the right specialist skill automatically. Here's what it can reach:

| Skill | Kind | What It Covers |
|-------|------|----------------|
| `sqlitedata-swift` | Router | Picks the right sub-skill for your task |
| `sqlitedata-swift-core` | Workflow | @Table, @FetchAll/@FetchOne/@Fetch, migrations, queries, database setup |
| `sqlitedata-swift-cloudkit` | Workflow | SyncEngine, CloudKit sync, sharing, SyncMetadata, schema constraints |
| `sqlitedata-swift-ref` | Reference | API signatures, types, init parameters, method reference |
| `sqlitedata-swift-diag` | Diagnostic | Errors, crashes, migration failures, sync issues |

Plus 7 bundled Apple CloudKit documentation skills:

| Skill | What It Covers |
|-------|----------------|
| `sqlitedata-swift-icloud-services` | Xcode iCloud capability setup, entitlements, container creation |
| `sqlitedata-swift-background-modes` | Remote Notifications mode required for CloudKit sync |
| `sqlitedata-swift-deploy-schema` | Dev-to-production schema deployment via CloudKit Console |
| `sqlitedata-swift-shared-records` | CKShare lifecycle, zone vs hierarchy, permissions |
| `sqlitedata-swift-cloudkit-sharing` | UICloudSharingController, CKShare delegates, change tokens |
| `sqlitedata-swift-ckrecord-id` | CKRecord.ID, UUID mapping, record name constraints |
| `sqlitedata-swift-swiftdata-sync` | SwiftData sync comparison and migration context |

### Skill Families

- **Front Door** — Start here by default. Use `/sqlitedata-swift:ask`.
- **Core Patterns** — @Table models, property wrappers, database setup, migrations, queries. Routes to `sqlitedata-swift-core`.
- **CloudKit Sync** — SyncEngine, sharing, sync metadata, schema constraints. Routes to `sqlitedata-swift-cloudkit` and the Apple doc skills.
- **Troubleshooting and Reference** — Debugging issues or looking up exact API signatures. Routes to `sqlitedata-swift-diag` and `sqlitedata-swift-ref`.

## About SQLiteData

[SQLiteData](https://github.com/pointfreeco/sqlite-data) is by [Point-Free](https://www.pointfree.co). It uses `@Table` structs instead of `@Model` classes, provides `@FetchAll`/`@FetchOne`/`@Fetch` property wrappers for reactive observation, and supports CloudKit synchronization and sharing — all built on [GRDB](https://github.com/groue/GRDB.swift).

For library documentation, installation, and examples, see the [SQLiteData repository](https://github.com/pointfreeco/sqlite-data).

## Acknowledgments

Plugin packaging inspired by [Axiom](https://github.com/CharlesWiltgen/Axiom) by Charles Wiltgen.

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

MIT — See [LICENSE](LICENSE).
