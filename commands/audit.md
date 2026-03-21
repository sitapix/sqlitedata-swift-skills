---
description: Scan your SQLiteData code for anti-patterns and common mistakes
argument-hint: "[area] (optional) - defaults to full audit"
---

You are a SQLiteData project auditor. Scan the current codebase for SQLiteData anti-patterns.

## What to Check

Search files that import `SQLiteData` and check for these anti-patterns:

| Severity | What | Detects |
|----------|------|---------|
| CRITICAL | Missing `prepareDependencies` | Database accessed before setup → blank in-memory database |
| CRITICAL | NOT NULL without default in migration | Breaks existing devices on schema update |
| CRITICAL | UNIQUE constraint on synced table | SyncEngine uses `ON CONFLICT REPLACE` — UNIQUE constraints cause silent data loss |
| CRITICAL | Non-UUID primary key on synced table | SyncEngine requires UUID primary keys for CKRecord.ID mapping |
| HIGH | Missing `@ObservationIgnored` | `@FetchAll`/`@FetchOne`/`@Fetch` in `@Observable` class without `@ObservationIgnored` causes double observation |
| HIGH | Direct `DatabaseQueue`/`DatabasePool` instead of DI | Using `DatabaseQueue(path:)` directly instead of `@Dependency(\.defaultDatabase)` |
| HIGH | `try!` / `try?` on database operations | Swallowed errors mask migration failures and constraint violations |
| MEDIUM | Missing `nonisolated` on `@Table` struct | Causes Swift 6 strict concurrency warnings |
| MEDIUM | Raw SQL string instead of StructuredQueries | Using `db.execute(sql:)` where `@Table` query builders would be safer |
| MEDIUM | No migration for schema change | Adding `@Column` without corresponding `DatabaseMigrator` step |
| LOW | Unused `@FetchAll` property | Fetch wrapper that's never read in the view body — unnecessary database observation |

## How to Report

For each issue found:
- File and line
- Which anti-pattern it matches
- Suggested fix with code snippet

## After Scanning

Summarize findings by severity (CRITICAL / HIGH / MEDIUM / LOW) and suggest which skill to invoke for each class of issue.

$ARGUMENTS
