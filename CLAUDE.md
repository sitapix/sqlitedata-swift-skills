# SQLiteData Skills

This is a Claude Code plugin providing expert guidance on **SQLiteData** by Point-Free — a fast, lightweight replacement for Apple's SwiftData, powered by SQLite (via GRDB) with CloudKit synchronization support.

The upstream library is at [pointfreeco/sqlite-data](https://github.com/pointfreeco/sqlite-data).

## Skills

| Skill | Use When |
|---|---|
| `/skill sqlitedata-swift` | Router — unsure which skill to use |
| `/skill sqlitedata-swift-core` | @Table, @FetchAll, @FetchOne, @Fetch, queries, database setup, migrations |
| `/skill sqlitedata-swift-cloudkit` | SyncEngine setup, sharing, SyncMetadata, schema constraints, account changes |
| `/skill sqlitedata-swift-ref` | API signatures, init parameters, FTS5, advanced patterns |
| `/skill sqlitedata-swift-diag` | Troubleshooting errors, crashes, sync failures, migration issues |
| `/skill sqlitedata-swift-cloudkit-setup` | iCloud capability, background modes, schema deployment |
| `/skill sqlitedata-swift-sharing-ref` | CKShare, CKRecord.ID, UICloudSharingController, permissions |
| `/skill sqlitedata-swift-swiftdata-sync` | SwiftData sync comparison, migration from SwiftData |

The router checks troubleshooting first, then routes to core patterns or launches the **sqlitedata-reference** agent for CloudKit/sync/API questions.

## Key Conventions

- Table definitions use raw SQL via `#sql()` macro in `DatabaseMigrator` migrations
- Model structs use `@Table nonisolated struct` pattern
- Enums use `QueryBindable` for column serialization
- `@ObservationIgnored` required on `@FetchAll`/`@FetchOne`/`@Fetch` in `@Observable` classes
- CloudKit-synced schemas require UUID primary keys with `NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())`
