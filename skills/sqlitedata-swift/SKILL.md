---
name: sqlitedata-swift
description: Use when you have a SQLiteData question and need help choosing the right skill — routes to sqlitedata-swift-core (models, queries, fetch property wrappers), sqlitedata-swift-diag (troubleshooting), or the domain agent for CloudKit sync, sharing, and API signatures based on the question
---

# SQLiteData Router

Route the user's question to the correct SQLiteData skill.

## Routing Decision Tree

Check in order. Troubleshooting is checked first — error/debug signals always take priority over feature routing, even when feature keywords are also present.

### 1. Is this a troubleshooting question?

Keywords: `error`, `crash`, `fail`, `not working`, `why`, `debug`, `fix`, `issue`, `problem`, `conflict`, `constraint`, `permission`

**Route to:** `/skill sqlitedata-swift-diag`

### 2. Is this about core patterns or implementation?

Keywords: `@Table`, `@FetchAll`, `@FetchOne`, `@Fetch`, `FetchKeyRequest`, `@Selection`, `@Column`, `DatabaseMigrator`, `prepareDependencies`, `defaultDatabase`, `#sql`, `query`, `insert`, `update`, `delete`, `join`, `leftJoin`, `Draft`, `seed`, `trigger`, `@Observable`, `@ObservationIgnored`, `database setup`, `migration`, `schema`

**Route to:** `/skill sqlitedata-swift-core`

### 3. Is this about CloudKit, sync, sharing, API reference, iCloud setup, or Apple docs?

Keywords: `SyncEngine`, `CloudKit`, `sync`, `share`, `CKShare`, `CKRecord`, `SyncMetadata`, `iCloud`, `API`, `signature`, `deploy schema`, `background modes`, `iCloud capability`, `UICloudSharingController`, `SwiftData sync`

**Route to:** launch **sqlitedata-reference** agent

### 4. Default

If unclear, invoke `/skill sqlitedata-swift-core` first — it covers the most common patterns.

## How to Route

**Registered skills** (invoke via `/skill`):

| Skill | Use for |
|-------|---------|
| `sqlitedata-swift-core` | @Table models, @FetchAll, migrations, queries, database setup |
| `sqlitedata-swift-diag` | Errors, crashes, troubleshooting, constraint violations |

**Domain agent** (launch via Agent tool with `subagent_type: "sqlitedata-swift:sqlitedata-reference"`):

| Agent | Covers |
|-------|--------|
| `sqlitedata-reference` | API reference, CloudKit SyncEngine, sharing, iCloud services, CKRecord.ID, background modes, schema deployment, SwiftData sync comparison |

To launch the agent, pass the user's question as the prompt. The agent runs in isolated context and returns a focused answer.

## When NOT to Use These Skills

- **SwiftData** questions — different library, different APIs
- **Core Data** questions — different persistence stack
- **Raw GRDB** without SQLiteData — these skills assume the SQLiteData layer on top
