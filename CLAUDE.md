# SQLiteData

This is the **SQLiteData** library by Point-Free — a fast, lightweight replacement for Apple's SwiftData, powered by SQLite (via GRDB) with CloudKit synchronization support.

## Project Structure

- `Sources/SQLiteData/` — Main library
  - `CloudKit/` — SyncEngine, sharing, metadata
  - `StructuredQueries+GRDB/` — GRDB integration layer
  - `Fetch.swift`, `FetchAll.swift`, `FetchOne.swift` — Property wrappers
  - `FetchKeyRequest.swift` — Multi-query transaction protocol
  - `Internal/` — Private implementation details
- `Sources/SQLiteDataTestSupport/` — Test utilities (`assertQuery`)
- `Tests/SQLiteDataTests/` — Test suite
- `Examples/` — Reminders app, SyncUps, CaseStudies, CloudKitDemo

## Key Technologies

- **Swift 6.0** with strict concurrency
- **GRDB** 7.6.0+ — SQLite wrapper
- **StructuredQueries** — `@Table`, `@Column`, `@Selection`, `#sql` macros
- **swift-dependencies** — `@Dependency`, `prepareDependencies`
- **swift-sharing** — `SharedReader` for reactive observation

## SQLiteData Skills

When working in this repo, use the custom SQLiteData skills for complete library knowledge:

| Slash Command | Use When |
|---|---|
| `/sqlitedata-swift` | Router — unsure which skill to use |
| `/sqlitedata-swift-core` | @Table, @FetchAll, @FetchOne, @Fetch, queries, database setup, migrations |
| `/sqlitedata-swift-cloudkit` | SyncEngine, CloudKit sync, sharing, SyncMetadata, schema constraints |
| `/sqlitedata-swift-ref` | API signatures, types, init parameters, method reference |
| `/sqlitedata-swift-diag` | Troubleshooting errors, crashes, sync failures, migration issues |

Apple CloudKit documentation (local, no web search needed):

| Slash Command | Apple Doc |
|---|---|
| `/apple-icloud-services` | Configuring iCloud services (Xcode capability setup) |
| `/apple-background-modes` | Configuring background execution modes (Remote Notifications) |
| `/apple-deploy-schema` | Deploying an iCloud Container's Schema to production |
| `/apple-shared-records` | CloudKit Shared Records API overview (CKShare, participants) |
| `/apple-cloudkit-sharing` | Sharing sample code (UICloudSharingController, CKShare lifecycle) |
| `/apple-ckrecord-id` | CKRecord.ID reference (record names, zone IDs) |
| `/apple-swiftdata-sync` | SwiftData iCloud sync (for comparison/migration) |

## Conventions

- Table definitions use raw SQL via `#sql()` macro in `DatabaseMigrator` migrations
- Model structs use `@Table nonisolated struct` pattern
- Enums use `QueryBindable` for column serialization
- `@ObservationIgnored` required on `@FetchAll`/`@FetchOne`/`@Fetch` in `@Observable` classes
- Tests use `assertQuery` from `SQLiteDataTestSupport` for snapshot testing
- CloudKit-synced schemas require UUID primary keys with `NOT NULL ON CONFLICT REPLACE DEFAULT (uuid())`
