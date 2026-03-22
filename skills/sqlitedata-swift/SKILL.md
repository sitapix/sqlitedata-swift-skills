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

### 1. Is this about core patterns or implementation?

Keywords: `@Table`, `@FetchAll`, `@FetchOne`, `@Fetch`, `FetchKeyRequest`, `@Selection`, `@Column`, `DatabaseMigrator`, `prepareDependencies`, `defaultDatabase`, `#sql`, `query`, `insert`, `update`, `delete`, `join`, `leftJoin`, `Draft`, `seed`, `trigger`, `@Observable`, `@ObservationIgnored`, `database setup`, `migration`, `schema`

**Route to:** `/skill sqlitedata-swift-core`

### 2. Is this a troubleshooting question?

Keywords: `error`, `crash`, `fail`, `not working`, `why`, `debug`, `fix`, `issue`, `problem`, `conflict`, `constraint`, `permission`

**Route to:** `/skill sqlitedata-swift-diag`

### 3. Is this about CloudKit, sync, sharing, API reference, iCloud setup, or Apple docs?

Keywords: `SyncEngine`, `CloudKit`, `sync`, `share`, `CKShare`, `CKRecord`, `SyncMetadata`, `iCloud`, `API`, `signature`, `deploy schema`, `background modes`, `iCloud capability`, `UICloudSharingController`, `SwiftData sync`

**Route to:** launch **sqlitedata-reference** agent

### 4. Default

If unclear, invoke `/skill sqlitedata-swift-core` first — it covers the most common patterns.

## How to Route

**Registered skills** (invoke via `/skill`):

| Skill | Use for |
|-------|---------|
| `sqlitedata-swift` | Broad routing — start here when the right destination is not obvious |
| `sqlitedata-swift-core` | @Table models, @FetchAll, migrations, queries, database setup |
| `sqlitedata-swift-diag` | Errors, crashes, troubleshooting, constraint violations |

**Domain agent** (launch via Agent tool with `subagent_type: "sqlitedata-swift:sqlitedata-reference"`):

| Agent | Covers |
|-------|--------|
| `sqlitedata-reference` | API reference, CloudKit SyncEngine, sharing, iCloud services, CKRecord.ID, background modes, schema deployment, SwiftData sync comparison |

To launch the agent, pass the user's question as the prompt. The agent runs in isolated context and returns a focused answer.

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
