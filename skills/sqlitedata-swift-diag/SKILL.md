---
name: sqlitedata-swift-diag
description: Use when debugging SQLiteData errors or unexpected behavior — covers common errors, migration failures, sync issues, query problems, permission errors, and schema constraint violations
license: MIT
---

# SQLiteData Diagnostics

## Real questions this skill answers

- "My @FetchAll isn't updating when data changes"
- "I'm getting 'no such table' after adding a migration"
- "SyncEngine stopped syncing with no error"
- "My app shows a blank database on launch"
- "FOREIGN KEY constraint failed on delete"
- "Cannot find type '@Table' — what import do I need?"

---

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

### SyncEngine init throws about UNIQUE constraints
- Remove all `UNIQUE` constraints from synced tables (except primary key)
- Use `dropUniqueConstraints: true` in `migratePrimaryKeys` if migrating

### SyncEngine init throws about RESTRICT/NO ACTION
- Change `ON DELETE RESTRICT` or `ON DELETE NO ACTION` to `ON DELETE CASCADE`, `SET NULL`, or `SET DEFAULT`

### "co.pointfree.SQLiteData.CloudKit.write-permission-error"
- User doesn't have write permission on a shared record
- Check `CKShare` permissions before attempting writes (see `/skill sqlitedata-swift-shared-records` for permission model: `.readOnly` vs `.readWrite` vs public)
- Catch: `catch let error as DatabaseError where error.message == SyncEngine.writePermissionError`

### "co.pointfree.SQLiteData.CloudKit.invalid-record-name-error"
- Primary key contains non-ASCII characters, is >255 chars, or begins with underscore (see `/skill sqlitedata-swift-ckrecord-id` for CloudKit record name constraints)
- Fix the primary key generation

### Data not syncing to other devices
1. Check `syncEngine.isRunning` is `true`
2. Check iCloud account is signed in (Settings > Apple ID > iCloud)
3. Verify iCloud + Background Modes capabilities are enabled (see `/skill sqlitedata-swift-icloud-services`, `/skill sqlitedata-swift-background-modes`)
4. In simulator: push notifications don't work — kill and relaunch app, or call `syncEngine.syncChanges()`
5. Check CloudKit Dashboard for errors (see `/skill sqlitedata-swift-deploy-schema` for console access)
6. Verify the table is listed in `SyncEngine(tables:)` or `privateTables:`

### Records sync but data is wrong/missing columns
- Newer device sent a record with columns older device doesn't know about
- Check `NOT NULL ON CONFLICT REPLACE DEFAULT` on all non-nullable columns
- See CloudKit skill for backwards-compatible migration rules

### "limitExceeded" errors
- Too many changes at once — SyncEngine batches automatically
- Foreign key constraint failures during sync can cascade this
- Usually self-resolves on retry

### "batchRequestFailed" errors
- Server-side issue — SyncEngine retries automatically
- Check CloudKit Dashboard status

### Share not working
- `CKSharingSupported = true` in Info.plist? (see `/skill sqlitedata-swift-shared-records` — required for share URL acceptance)
- Table in `tables:` parameter (not `privateTables:`)?
- Record is a "root" record (no foreign keys)? Only root records can be shared (see `/skill sqlitedata-swift-shared-records`)
- Record has a UUID primary key? (see `/skill sqlitedata-swift-ckrecord-id`)
- `acceptShare(metadata:)` called in SceneDelegate? (see `/skill sqlitedata-swift-cloudkit-sharing` for full acceptance flow)

## 4. @FetchAll / @FetchOne / @Fetch Issues

### Data not updating in UI
- In `@Observable` class: add `@ObservationIgnored` to the fetch property wrapper
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

## Quick Diagnostic Checklist

1. `import SQLiteData` present?
2. `prepareDependencies` called once at app start?
3. `migrator.migrate(database)` called?
4. `@ObservationIgnored` on fetch wrappers in `@Observable`?
5. Table names match between `@Table` and SQL?
6. Column types match between Swift and SQL?
7. For CloudKit: UUID primary keys with `ON CONFLICT REPLACE`?
8. For CloudKit: no UNIQUE constraints, no RESTRICT/NO ACTION?
9. Foreign key indexes created?
10. `configuration.foreignKeysEnabled = true` if using foreign keys?
