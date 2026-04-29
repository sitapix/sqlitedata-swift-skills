# SQLiteData

[![Claude Code](https://img.shields.io/badge/Claude%20Code-compatible-d97757)](https://code.claude.com)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-compatible-blue)](https://github.com/vercel-labs/skills)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Skills for [SQLiteData](https://github.com/pointfreeco/sqlite-data) by Point-Free: `@Table` models, `@FetchAll`/`@FetchOne`/`@Fetch` wrappers, GRDB queries, migrations, and CloudKit SyncEngine.

## Install

### Any agent via the [skills CLI](https://github.com/vercel-labs/skills)

```sh
# Interactive picker
npx skills add sitapix/sqlitedata-swift-skills

# Install everything
npx skills add sitapix/sqlitedata-swift-skills --all

# Install specific skills
npx skills add sitapix/sqlitedata-swift-skills --skill sqd-core --skill sqd-diag
npx skills add sitapix/sqlitedata-swift-skills --skill sqd-cloudkit

# Check for and apply updates
npx skills check
npx skills update
```

### Claude Code (plugin marketplace)

```sh
# Add the marketplace
/plugin marketplace add sitapix/sqlitedata-swift-skills

# Install the plugin
/plugin install sqlitedata-swift@sqlitedata-swift-marketplace
```

## Skills

| Skill | What it covers |
|-------|----------------|
| [sqd-core](skills/sqd-core/) | `@Table`, `@FetchAll`, `@FetchOne`, `@Fetch`, queries, database setup, migrations |
| [sqd-cloudkit](skills/sqd-cloudkit/) | SyncEngine setup, sharing, SyncMetadata, schema constraints, account changes |
| [sqd-cloudkit-setup](skills/sqd-cloudkit-setup/) | iCloud capability, background modes, schema deployment to production |
| [sqd-diag](skills/sqd-diag/) | Troubleshoot errors, crashes, sync failures, migration issues |
| [sqd-ref](skills/sqd-ref/) | API signatures, init parameters, FTS5, advanced patterns |
| [sqd-sharing](skills/sqd-sharing/) | CKShare, CKRecord.ID, UICloudSharingController, permissions |
| [sqd-swiftdata-sync](skills/sqd-swiftdata-sync/) | SwiftData sync comparison and migration from SwiftData |

## Getting Started

Skills activate from your questions. Ask your assistant:

```
"How do I set up a SQLiteData database?"
"My @FetchAll isn't updating the view"
"How do I sync with CloudKit using SyncEngine?"
"What's the difference between @FetchAll and @FetchOne?"
"My migration is failing with a constraint error"
"How do I share records with other iCloud users?"
```

Or invoke a skill directly:

```
/sqd-core           # @Table, @FetchAll, migrations
/sqd-cloudkit       # SyncEngine, sharing, SyncMetadata
/sqd-diag           # debug errors and sync issues
```

If you installed via the Claude Code plugin marketplace, prefix each command with `sqlitedata-swift:`. For example, `/sqlitedata-swift:sqd-core`.

## About SQLiteData

[SQLiteData](https://github.com/pointfreeco/sqlite-data) is by [Point-Free](https://www.pointfree.co). It uses `@Table` structs instead of `@Model` classes, gives you `@FetchAll`/`@FetchOne`/`@Fetch` for reactive observation, and adds CloudKit sync and sharing on top of [GRDB](https://github.com/groue/GRDB.swift).

## License

MIT. See [LICENSE](LICENSE).
