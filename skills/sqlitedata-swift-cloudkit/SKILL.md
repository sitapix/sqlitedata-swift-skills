---
name: sqlitedata-swift-cloudkit
description: Use when implementing CloudKit sync with SQLiteData — covers SyncEngine setup, sharing records, SyncMetadata queries, backwards-compatible migrations, schema constraints, account changes, and testing sync. NOT for core @Table/@FetchAll patterns (use core) or error lookup (use diag)
---

# SQLiteData CloudKit Synchronization

Complete guide for CloudKit sync with SQLiteData's `SyncEngine`.

## Architecture

`SyncEngine` wraps Apple's `CKSyncEngine` (iOS 17+) and:
1. Monitors local SQLite changes via database triggers
2. Sends local changes to CloudKit (private + shared databases)
3. Receives remote changes and applies them locally
4. Manages a separate **metadatabase** (`sqlitedata_icloud_metadata.sqlite`) for CloudKit metadata
5. Handles field-level conflict resolution ("last edit wins" per column)

## 1. Project Setup (Xcode)

Before any code:
1. Enable **iCloud** capability → check **CloudKit** (see `/skill sqlitedata-swift-cloudkit-setup` Step 1)
2. Enable **Background Modes** → check **Remote notifications** (see `/skill sqlitedata-swift-cloudkit-setup` Step 2)
3. Add `CKSharingSupported = true` to Info.plist (if sharing — see `/skill sqlitedata-swift-sharing-ref`)
4. Before shipping: deploy schema to production (see `/skill sqlitedata-swift-cloudkit-setup` Step 3)

## 2. SyncEngine Initialization

```swift
@main
struct MyApp: App {
  @State var syncDelegate = MySyncDelegate()

  init() {
    try! prepareDependencies {
      $0.defaultDatabase = try appDatabase()
      $0.defaultSyncEngine = try SyncEngine(
        for: $0.defaultDatabase,
        tables: RemindersList.self, Reminder.self, Tag.self, ReminderTag.self,
        privateTables: UserPreferences.self,  // Not shareable
        containerIdentifier: "iCloud.com.example.app",  // nil = from entitlements
        startImmediately: true,  // default
        delegate: syncDelegate,
        logger: Logger(subsystem: "MyApp", category: "CloudKit")
      )
    }
  }
}
```

**Key distinction:**
- `tables:` — Synced AND shareable with other iCloud users
- `privateTables:` — Synced but NOT shareable (private database only)

## 3. Schema Requirements for CloudKit

### Globally Unique Primary Keys (REQUIRED)

Your `@Table` UUID primary key becomes a `CKRecord.ID` record name in CloudKit — ASCII, max 255 chars, unique per zone (see `/skill sqlitedata-swift-sharing-ref` for the underlying CloudKit constraints).

```sql
-- CORRECT: UUID primary key with ON CONFLICT REPLACE
CREATE TABLE "items" (
  "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid()),
  ...
) STRICT

-- WRONG: Integer autoincrement (conflict across devices)
CREATE TABLE "items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  ...
)
```

### Primary Key on EVERY Synced Table (REQUIRED)

Even join tables need a single (non-compound) primary key:

```sql
CREATE TABLE "reminderTags" (
  "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid()),
  "reminderID" TEXT NOT NULL REFERENCES "reminders"("id") ON DELETE CASCADE,
  "tagID" TEXT NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE
) STRICT
```

### NO Uniqueness Constraints (REQUIRED)

Tables with `UNIQUE` constraints (other than primary key) **cannot be synchronized**. SyncEngine throws an error on initialization if detected.

**Workaround:** Make the unique column the primary key itself:
```swift
@Table
struct RemindersListAsset {
  @Column(primaryKey: true)
  let remindersListID: RemindersList.ID  // Acts as both PK and FK
  var coverImage: Data?
}
```

### Foreign Key Rules

- Supported `ON DELETE` actions: `CASCADE`, `SET NULL`, `SET DEFAULT`
- **NOT supported:** `RESTRICT`, `NO ACTION` (throws error)
- SyncEngine handles out-of-order records (caches children until parent arrives)

### NOT NULL Columns MUST Have ON CONFLICT REPLACE

```sql
-- CORRECT
"position" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0

-- WRONG (will fail when older devices sync records without this column)
"position" INTEGER NOT NULL DEFAULT 0
```

### Reserved CloudKit Field Names (DO NOT USE)

These are `CKRecord` system metadata fields (see `/skill sqlitedata-swift-sharing-ref` for full list). Do not use as column names:

`creationDate`, `creatorUserRecordID`, `etag`, `lastModifiedUserRecordID`, `modificationDate`, `modifiedByDevice`, `recordChangeTag`, `recordID`, `recordType`

## 4. Backwards-Compatible Migrations

### Adding Tables — Safe

New tables are safe. Unrecognized records from newer devices are cached until the table exists.

### Adding Columns — Use ON CONFLICT REPLACE or nullable

```sql
-- Option A: NOT NULL with ON CONFLICT REPLACE + default
ALTER TABLE "remindersLists"
ADD COLUMN "position" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0

-- Option B: Nullable (when no sensible default exists)
ALTER TABLE "remindersLists"
ADD COLUMN "groupID" TEXT REFERENCES "groups"("id")
```

### DISALLOWED Migrations

CloudKit schemas are additive-only once deployed to production (see `/skill sqlitedata-swift-cloudkit-setup` Step 3):
- Removing columns
- Renaming columns
- Renaming tables

## 5. Attaching Metadatabase

To query `SyncMetadata` (CloudKit record data), attach in `prepareDatabase`:

```swift
configuration.prepareDatabase { db in
  try db.attachMetadatabase()
}
```

This enables joining `SyncMetadata` to your tables to access `CKRecord` metadata and `CKShare` data (see `/skill sqlitedata-swift-sharing-ref`).

## 6. SyncMetadata Table

```swift
@Table("sqlitedata_icloud_metadata")
public struct SyncMetadata: Hashable, Identifiable, Sendable {
  public struct ID: Hashable, Sendable {
    public let recordPrimaryKey: String
    public let recordType: String
  }
  public let id: ID
  public var recordPrimaryKey: String { id.recordPrimaryKey }
  public var recordType: String { id.recordType }
  public let zoneName: String
  public let ownerName: String
  public let recordName: String
  public let parentRecordID: ParentID?
  public let lastKnownServerRecord: CKRecord?
  public let share: CKShare?
  public var hasLastKnownServerRecord: Bool
  public var isShared: Bool
  public let userModificationTime: Int64
}
```

### Joining SyncMetadata to Your Tables

```swift
@FetchAll(
  RemindersList
    .leftJoin(SyncMetadata.all) { $0.syncMetadataID.eq($1.id) }
    .select {
      Row.Columns(
        remindersList: $0,
        isShared: $1.isShared ?? false,
        share: $2.share
      )
    }
)
var rows
```

Use `$0.syncMetadataID` — available on all `PrimaryKeyedTable` types — to join.

### Fetching CKRecord for a Record

```swift
let serverRecord = try database.read { db in
  try SyncMetadata
    .find(remindersList.syncMetadataID)
    .select(\.lastKnownServerRecord)
    .fetchOne(db) ?? nil
}
```

## 7. Sharing Records

SQLiteData wraps CloudKit's sharing API (`CKShare`, `UICloudSharingController`). For Apple's underlying sharing model — record zones vs hierarchies, participant management, permission types, and UICloudSharingController sample code — see `/skill sqlitedata-swift-sharing-ref`.

### Share a Record

```swift
@Dependency(\.defaultSyncEngine) var syncEngine

let sharedRecord = try await syncEngine.share(
  record: remindersList,
  configure: { share in
    share.publicPermission = .readOnly
    // or .readWrite, .none
  }
)
// sharedRecord.share is the CKShare
```

### Unshare

```swift
try await syncEngine.unshare(record: remindersList)
```

### Accept Incoming Share (SceneDelegate)

When a user taps a share URL, CloudKit provides `CKShare.Metadata` to your app delegate. SQLiteData simplifies acceptance — for the full CloudKit acceptance flow, see `/skill sqlitedata-swift-sharing-ref`.

```swift
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  @Dependency(\.defaultSyncEngine) var syncEngine

  func windowScene(
    _ windowScene: UIWindowScene,
    userDidAcceptCloudKitShareWith metadata: CKShare.Metadata
  ) {
    Task { try await syncEngine.acceptShare(metadata: metadata) }
  }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
             options connectionOptions: UIScene.ConnectionOptions) {
    guard let metadata = connectionOptions.cloudKitShareMetadata else { return }
    Task { try await syncEngine.acceptShare(metadata: metadata) }
  }
}
```

### Write Permission Errors

```swift
do {
  try await database.write { db in
    try Reminder.find(id).update { $0.title = "New" }.execute(db)
  }
} catch let error as DatabaseError where error.message == SyncEngine.writePermissionError {
  // User doesn't have write permission on this shared record
}
```

## 8. SyncEngine State Observation

All observable in SwiftUI:

```swift
@Dependency(\.defaultSyncEngine) var syncEngine

syncEngine.isRunning          // Bool
syncEngine.isSynchronizing    // Bool (sending OR fetching)
syncEngine.isSendingChanges   // Bool
syncEngine.isFetchingChanges  // Bool
```

Usage in UI:
```swift
if syncEngine.isSynchronizing {
  ProgressView()
}
```

## 9. SyncEngine Control

```swift
// Manual sync
try await syncEngine.start()
syncEngine.stop()
try await syncEngine.fetchChanges(options)
try await syncEngine.sendChanges(options)
try await syncEngine.syncChanges()  // fetch + send

// Delete all local data (e.g., on account change)
try await syncEngine.deleteLocalData()
```

## 10. Account Change Handling (SyncEngineDelegate)

```swift
@MainActor
@Observable
class MySyncDelegate: SyncEngineDelegate {
  var isDeleteLocalDataAlertPresented = false

  func syncEngine(
    _ syncEngine: SyncEngine,
    accountChanged changeType: CKSyncEngine.Event.AccountChange.ChangeType
  ) async {
    switch changeType {
    case .signIn:
      break
    case .signOut, .switchAccounts:
      isDeleteLocalDataAlertPresented = true
    @unknown default:
      break
    }
  }
}

// In view:
.alert("Reset local data?", isPresented: $delegate.isDeleteLocalDataAlertPresented) {
  Button("Reset", role: .destructive) {
    Task { try await syncEngine.deleteLocalData() }
  }
}
```

**Default behavior (no delegate):** Auto-deletes local data on sign out.

## 11. Triggers + Sync Awareness

Skip trigger actions during sync using `SyncEngine.isSynchronizing`:

```swift
// StructuredQueries builder
Model.createTemporaryTrigger(
  after: .insert { new in ... }
  when: { _ in !SyncEngine.$isSynchronizing }
)

// Raw SQL
#sql("""
  CREATE TEMPORARY TRIGGER "..."
  AFTER DELETE ON "..."
  FOR EACH ROW WHEN NOT \(SyncEngine.$isSynchronizing)
  BEGIN ... END
  """)
```

**When to use:** Triggers that set `updatedAt` timestamps or app-specific side effects.
**When NOT to use:** FTS index triggers should run regardless of sync source.

## 12. Assets (BLOB Columns)

BLOB columns are automatically converted to `CKAsset`s. Best practice: **separate table for large data**:

```swift
@Table
struct RemindersListAsset {
  @Column(primaryKey: true)
  let remindersListID: RemindersList.ID
  var coverImage: Data?
}
```

## 13. Primary Key Migration (Integer → UUID)

For existing apps with integer primary keys:

```swift
migrator.registerMigration("Migrate to UUID primary keys") { db in
  try SyncEngine.migratePrimaryKeys(
    db,
    tables: Reminder.self, RemindersList.self, Tag.self
  )
}
```

This handles: UUID generation (deterministic via MD5), data preservation, foreign key updates, index/trigger recreation.

## 14. Testing & Previews with SyncEngine

### Bootstrap helper pattern:

```swift
extension DependencyValues {
  mutating func bootstrapDatabase(
    syncEngineDelegate: (any SyncEngineDelegate)? = nil
  ) throws {
    defaultDatabase = try appDatabase()
    defaultSyncEngine = try SyncEngine(
      for: defaultDatabase,
      tables: RemindersList.self, Reminder.self,
      delegate: syncEngineDelegate
    )
  }
}

// App: try! prepareDependencies { try $0.bootstrapDatabase(syncEngineDelegate: delegate) }
// Test: @Suite(.dependencies { try! $0.bootstrapDatabase() })
// Preview: let _ = try! prepareDependencies { try $0.bootstrapDatabase() }
```

## 15. Conflict Resolution

- Strategy: **field-wise last edit wins** (per column, not per record)
- Each column edit is timestamped
- When merging conflicts, the most recently edited column value wins
- No CRDT support (may come in future)

## 16. Simulator Limitations

Simulators don't receive push notifications (the `remote-notification` background mode — see `/skill sqlitedata-swift-cloudkit-setup` Step 2), so:
- Changes don't auto-sync from CloudKit to simulator
- Force sync: kill and relaunch the app, or use `syncEngine.syncChanges()`

## Common CloudKit Mistakes

1. **Integer primary keys** — Must be UUID TEXT for distributed sync (see `/skill sqlitedata-swift-sharing-ref`)
2. **UNIQUE constraints** on non-PK columns — Not allowed with sync
3. **NOT NULL without ON CONFLICT REPLACE** — Breaks cross-version sync
4. **RESTRICT/NO ACTION foreign keys** — Not supported
5. **Editing deployed migrations** — Always add new migrations (see `/skill sqlitedata-swift-cloudkit-setup` Step 3)
6. **Removing/renaming columns** — Not allowed with distributed schema
7. **Not attaching metadatabase** — Required to query SyncMetadata
8. **Using reserved CloudKit field names** as column names

## Apple Documentation Skills

For Apple's CloudKit documentation (no web search needed):
- `/skill sqlitedata-swift-cloudkit-setup` — iCloud capability, background modes, schema deployment
- `/skill sqlitedata-swift-sharing-ref` — CKShare, CKRecord.ID, UICloudSharingController, permissions
- `/skill sqlitedata-swift-swiftdata-sync` — SwiftData sync (for comparison/migration)
