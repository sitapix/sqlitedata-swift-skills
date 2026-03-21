---
name: sqlitedata-swift
description: Use when working with SQLiteData or unsure which skill to use — routes to sqlitedata-swift-core (models, queries, fetch wrappers), sqlitedata-swift-cloudkit (sync, sharing, metadata), sqlitedata-swift-ref (API signatures), or sqlitedata-swift-diag (troubleshooting) based on the question
license: MIT
---

# SQLiteData Router

Route the user's question to the correct SQLiteData skill.

## Do NOT Skip This Skill

| Your thought | Why it's wrong |
|---|---|
| "This is just SwiftData" | SQLiteData uses `@Table` not `@Model`, SQL migrations not `VersionedSchema`, and `@FetchAll` not `@Query`. SwiftData patterns will produce broken code |
| "I know how GRDB works" | SQLiteData adds `@FetchAll`/`@FetchOne`/`@Fetch` wrappers, `swift-dependencies` DI, and `SyncEngine` on top. Raw GRDB patterns miss these layers |
| "I can figure out the sync" | SyncEngine has specific schema constraints (UUID primary keys, `ON CONFLICT REPLACE`, no UNIQUE). Getting one wrong silently corrupts sync |
| "This migration is straightforward" | CloudKit-synced tables need backwards-compatible migrations only. Adding a NOT NULL column without a default will crash on existing devices |
| "I'll just set up the database" | `prepareDependencies` must be called before any view accesses `@FetchAll`. Wrong order → blank in-memory database with no error |
| "Let me check the docs" | SQLiteData is new, docs are sparse. These skills synthesize patterns from the source code, examples, and CloudKit integration details |
| "This is a simple query" | StructuredQueries uses `@Table` macros, `@Selection` column groups, and `#sql` fragments. The syntax differs from raw GRDB query building |

## Routing Decision Tree

### 1. Is this about CloudKit sync, sharing, or SyncEngine?

Keywords: `SyncEngine`, `CloudKit`, `sync`, `share`, `CKShare`, `CKRecord`, `SyncMetadata`, `iCloud`, `metadatabase`, `attachMetadatabase`, `acceptShare`, `privateTable`, `distributed schema`, `backwards compatible migration`, `ON CONFLICT REPLACE`, `primary key migration`, `migratePrimaryKeys`, `account change`, `SyncEngineDelegate`

**Route to:** `/skill sqlitedata-swift-cloudkit`

### 2. Is this about core patterns or implementation?

Keywords: `@Table`, `@FetchAll`, `@FetchOne`, `@Fetch`, `FetchKeyRequest`, `@Selection`, `@Column`, `DatabaseMigrator`, `prepareDependencies`, `defaultDatabase`, `#sql`, `query`, `insert`, `update`, `delete`, `join`, `leftJoin`, `Draft`, `seed`, `trigger`, `@Observable`, `@ObservationIgnored`, `database setup`, `migration`, `schema`

**Route to:** `/skill sqlitedata-swift-core`

### 3. Is this about API signatures or type details?

Keywords: `API`, `init`, `signature`, `parameter`, `method`, `property`, `protocol`, `type`, `reference`, `what methods`, `what properties`, `available on`, `how do I call`

**Route to:** `/skill sqlitedata-swift-ref`

### 4. Is this a troubleshooting question?

Keywords: `error`, `crash`, `fail`, `not working`, `why`, `debug`, `fix`, `issue`, `problem`, `conflict`, `constraint`, `permission`

**Route to:** `/skill sqlitedata-swift-diag`

### 5. Is this about Apple's CloudKit/iCloud documentation?

Keywords: `CKRecord`, `CKShare`, `UICloudSharingController`, `CKSyncEngine`, `deploy schema`, `iCloud container`, `background modes`, `remote notifications`, `iCloud capability`, `SwiftData sync`, `CloudKit setup`, `entitlements`, `sharing UI`, `record ID`, `CKRecord.ID`, `CKAcceptSharesOperation`

**Route to the specific Apple skill:**
- Xcode iCloud capability → `/skill sqlitedata-swift-icloud-services`
- Background modes / remote notifications → `/skill sqlitedata-swift-background-modes`
- Deploy schema to production → `/skill sqlitedata-swift-deploy-schema`
- CloudKit sharing API / CKShare → `/skill sqlitedata-swift-shared-records`
- Sharing sample code / UICloudSharingController → `/skill sqlitedata-swift-cloudkit-sharing`
- CKRecord.ID / record names → `/skill sqlitedata-swift-ckrecord-id`
- SwiftData sync / migration comparison → `/skill sqlitedata-swift-swiftdata-sync`

### 6. Default

If unclear, invoke `/skill sqlitedata-swift-core` first — it covers the most common patterns.

## Quick Reference: What This Library IS

**SQLiteData** is Point-Free's fast, lightweight replacement for SwiftData:
- Built on **GRDB** (SQLite) + **StructuredQueries** (type-safe SQL)
- Uses **swift-dependencies** for DI and **swift-sharing** for reactive observation
- Provides `@FetchAll`, `@FetchOne`, `@Fetch` property wrappers (like SwiftData's `@Query`)
- Full **CloudKit sync** via `SyncEngine` (wraps `CKSyncEngine`)
- **Not SwiftData** — uses `@Table` not `@Model`, uses SQL migrations not `VersionedSchema`

## Key Differences from SwiftData

| SwiftData | SQLiteData |
|-----------|-----------|
| `@Model` | `@Table` (from StructuredQueries) |
| `@Query` | `@FetchAll` / `@FetchOne` / `@Fetch` |
| `@Relationship` | SQL `REFERENCES` + joins |
| `ModelContainer` | `prepareDependencies { $0.defaultDatabase = ... }` |
| `ModelContext` | `@Dependency(\.defaultDatabase)` + `.write { db in }` |
| `#Predicate` | `.where { $0.field == value }` or `#sql(...)` |
| `FetchDescriptor` | StructuredQueries query builders |
| `VersionedSchema` | `DatabaseMigrator` with raw SQL |
| Automatic CloudKit | `SyncEngine` (explicit, configurable) |

## When NOT to Use These Skills

- For **SwiftData** questions → these are a different library, don't apply SQLiteData patterns
- For **Core Data** questions → different persistence stack entirely
- For **raw GRDB** without SQLiteData → SQLiteData skills assume the SQLiteData layer on top of GRDB
