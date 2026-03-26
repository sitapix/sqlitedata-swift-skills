---
name: sqlitedata-swift-diag
description: Use when a SQLiteData error message or unexpected behavior occurs — symptom-to-fix lookup for build errors, runtime crashes, migration failures, and query problems. NOT for implementing features (use core) or learning CloudKit sync patterns (use router)
---

# SQLiteData Diagnostics

Symptom-based troubleshooting for SQLiteData issues.

## 1. Build/Compilation Errors

### "Cannot find type 'Table' / '@Table'"
- Missing `import SQLiteData` (it re-exports StructuredQueriesSQLite)
- Package.swift missing `swift-structured-queries` dependency (should come transitively via SQLiteData)

### "Cannot convert value of type 'X' to expected argument type..."
- Check that your `@Table` struct fields match the SQL schema types
- `TEXT` → `String` or `UUID`, `INTEGER` → `Int` or `Bool`, `REAL` → `Double`, `BLOB` → `Data`
- Enums must conform to `QueryBindable`

### "Referencing static method 'buildExpression' requires..."
- Usually means a type mismatch in `.select { }` closure
- Check that `@Selection` struct field types match query expressions

### Concurrency warnings on @Table structs
- Add `nonisolated` before the struct: `@Table nonisolated struct Item { ... }`

## 2. Runtime Database Errors

### "no such table: X"
- Migration hasn't run → check `migrator.migrate(database)` is called
- Table name mismatch → `@Table("customName")` must match SQL `CREATE TABLE "customName"`
- In previews/tests: `prepareDependencies` not called

### "no such column: X"
- Column name in Swift doesn't match SQL schema
- Migration adding the column hasn't been registered
- Swift property names are auto-converted to camelCase column names

### "FOREIGN KEY constraint failed"
- Inserting child before parent exists
- Deleting parent without `ON DELETE CASCADE`
- SyncEngine handles this automatically during sync — if in app code, insert parent first

### "NOT NULL constraint failed"
- Inserting NULL into a NOT NULL column without a default
- For CloudKit: use `NOT NULL ON CONFLICT REPLACE DEFAULT <value>`

### "UNIQUE constraint failed"
- Duplicate primary key or unique column value
- For CloudKit-synced tables: unique constraints (except PK) are not allowed

### "database is locked"
- Long-running read blocking writes (or vice versa)
- Consider using `DatabasePool` instead of `DatabaseQueue`
- Check for nested `database.write` calls

## 3. SyncEngine Errors

Quick symptom→fix map. For full CloudKit sync patterns, use `/skill sqlitedata-swift`.

| Symptom | Fix |
|---------|-----|
| SyncEngine init throws about UNIQUE | Remove all `UNIQUE` constraints from synced tables (except PK). Workaround: make the unique column the primary key via `@Column(primaryKey: true)` — see `/skill sqlitedata-swift-cloudkit` §3 |
| SyncEngine init throws about RESTRICT/NO ACTION | Change to `ON DELETE CASCADE`, `SET NULL`, or `SET DEFAULT` |
| `write-permission-error` | User lacks write permission on shared record — catch via `SyncEngine.writePermissionError` |
| `invalid-record-name-error` | Primary key has non-ASCII chars, >255 chars, or starts with underscore |
| Data not syncing | Check: `isRunning == true`, iCloud signed in, capabilities enabled, table listed in `SyncEngine(tables:)` |
| Records sync but data wrong | Missing `NOT NULL ON CONFLICT REPLACE DEFAULT` on non-nullable columns |
| `limitExceeded` / `batchRequestFailed` | Transient — SyncEngine retries automatically |
| Share not working | Check: `CKSharingSupported` in Info.plist, table in `tables:` (not `privateTables:`), root record with UUID PK, `acceptShare(metadata:)` in SceneDelegate |

## 4. @FetchAll / @FetchOne / @Fetch Issues

### Data not updating in UI
- In `@Observable` class: add `@ObservationIgnored` to the fetch property wrappers
- Check database is the same instance: `@Dependency(\.defaultDatabase)` must be the prepared one
- `prepareDependencies` only called once?

### "A blank, in-memory database is being used"
- `prepareDependencies` not called, or called after first access
- In previews: `let _ = prepareDependencies { ... }` at top of `#Preview`
- In tests: `.dependency(\.defaultDatabase, ...)` trait

### Query returns empty but data exists
- Check query conditions: `.where { }` filter may be wrong
- Table name mismatch between SQL and `@Table`
- Database not migrated (tables don't exist)

### Load error on @Fetch property
- Check `$property.loadError` for details
- Common: SQL syntax error in `#sql(...)` macro
- Common: Type mismatch between query output and expected type

### @Fetch with FetchKeyRequest not loading
- `FetchKeyRequest` requires a `key` value before it fetches — check the key is set
- If using `@Fetch(ItemRequest())` with a default key, ensure the key matches an actual row
- `@Fetch` does not auto-load on init — call `load()` or set a key to trigger the fetch
- Check `$property.loadError` — a nil key produces no error but also no data

### ValueObservation / SharedReader stale data
- `SharedReader` caches the last emitted value — if the underlying query changes shape (e.g. table renamed), the reader stays stale
- `@FetchAll` uses `ValueObservation` internally — if the observed tables haven't changed, no update fires
- Writes via raw SQL (`db.execute(sql:)`) bypass StructuredQueries change tracking — use `@Table` query builders instead
- If using `DatabaseQueue`: only one connection, reads wait on writes — observation may appear delayed

### "Cannot subscribe to observation" / subscription issues
- `FetchSubscription.cancel()` called too early
- Database connection closed
- Using `DatabaseQueue` in multithreaded context (use `DatabasePool`)

## 5. Migration Issues

### eraseDatabaseOnSchemaChange causes data loss in dev
- This is expected behavior — it's a DEBUG-only convenience
- Wrap in `#if DEBUG`: `migrator.eraseDatabaseOnSchemaChange = true`
- For production: always add new migrations, never edit existing ones

### migratePrimaryKeys throws
- Schema it doesn't know how to handle — fall back to manual migration
- See `ManuallyMigratingPrimaryKeys` docs

### ALTER TABLE fails
- SQLite has limited ALTER TABLE support
- Can only: add columns, rename table, rename column
- Cannot: drop columns (SQLite 3.35+), add constraints to existing columns
- For complex changes: create new table, copy data, drop old, rename new

### Migration ordering / dependencies
- Migrations run in registration order — if migration B references a table from migration A, register A first
- Never reorder existing migrations — new devices replay from the start
- If two migrations touch the same table, combine them or use explicit ordering keys
- CloudKit-synced schemas must be backwards-compatible — never remove or rename columns in migrations

## 6. Preview Issues

### Previews crash or show empty data
```swift
#Preview {
  let _ = try! prepareDependencies {
    try $0.bootstrapDatabase()
    try? $0.defaultDatabase.seedSampleData()
  }
  ContentView()
}
```

### CloudKit previews crash
- Mock cloud container is used automatically in preview context
- If still crashing: check `SyncEngine` init isn't hitting network
- Use `startImmediately: false` and don't call `.start()` in previews

## 7. Testing Issues

### Tests interfere with each other
- Each test gets its own temporary database via `defaultDatabase()`
- Use `.dependency(\.defaultDatabase, ...)` trait per suite
- Don't share database instances across test suites

### Test database has no tables
- Run migrations in test setup: `try migrator.migrate(database)`
- Or use `bootstrapDatabase()` helper

### Preview works but tests fail (or vice versa)
- Preview and tests use different `prepareDependencies` calls — ensure both set up the same migrations
- Preview may use `seedSampleData()` which inserts rows — tests should start clean
- `@MainActor` isolation in tests can cause issues with database access — use `nonisolated` test methods or `withDependencies` for explicit setup

### Device vs simulator differences
- Simulator uses different file paths — `NSHomeDirectory()` changes per boot
- CloudKit sync requires a real iCloud account — simulator with no account silently skips sync
- File protection levels behave differently in simulator — `.completeUnlessOpen` may not block reads as expected

## Quick Diagnostic Checklist

1. `import SQLiteData` present?
2. `prepareDependencies` called once at app start?
3. `migrator.migrate(database)` called?
4. `@ObservationIgnored` on fetch property wrappers in `@Observable`?
5. Table names match between `@Table` and SQL?
6. Column types match between Swift and SQL?
7. For CloudKit: UUID primary keys with `ON CONFLICT REPLACE`?
8. For CloudKit: no UNIQUE constraints, no RESTRICT/NO ACTION?
9. Foreign key indexes created?
10. `configuration.foreignKeysEnabled = true` if using foreign keys?
