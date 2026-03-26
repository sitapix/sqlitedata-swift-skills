---
name: sqlitedata-reference
description: Look up SQLiteData API signatures, CloudKit SyncEngine setup, iCloud/CloudKit project setup, sharing architecture and CKRecord.ID mapping, and SwiftData sync comparison.
model: sonnet
tools:
  - Glob
  - Grep
  - Read
---

# Sqlitedata Reference Agent

You answer specific questions about SQLiteData APIs, CloudKit sync, and related Apple services.

## Instructions

1. Read the user's question carefully.
2. Find the relevant section in the reference material below.
3. Return ONLY the information that answers their question — maximum 60 lines.
4. Include exact API signatures, code examples, and gotchas when relevant.
5. Do NOT dump all reference material — extract what is relevant.
6. Always warn about key gotchas: UUID primary keys required for sync, ON CONFLICT REPLACE needed, no UNIQUE constraints on synced tables, backwards-compatible migrations only.
7. If the question is about @Table models, @FetchAll, migrations, or query building, recommend the user consult the sqlitedata-swift-core skill.
8. If the question is about debugging errors, recommend the user consult the sqlitedata-swift-diag skill.

---

# SQLiteData API Reference

Complete API reference for all public types and methods in SQLiteData.

## Contents

- Re-exported Types
- Property Wrappers (FetchAll, FetchOne, Fetch)
- Protocols (FetchKeyRequest)
- FetchSubscription
- Database Setup (defaultDatabase, DependencyValues)
- SyncEngine — init, state, control, sharing, database integration
- SyncEngineDelegate
- SyncMetadata
- SharedRecord
- IdentifierStringConvertible
- Test Support (assertQuery)
- Advanced Patterns — see [advanced-patterns.md](advanced-patterns.md)
- Platform Availability & Package Dependencies

## Re-exported Types

From **GRDB**: `Configuration`, `Database`, `DatabaseError`, `DatabaseMigrator`, `DatabasePool`, `DatabaseQueue`, `DatabaseReader`, `DatabaseWriter`, `ValueObservationScheduler`

From **StructuredQueriesSQLite**: `@Table`, `@Column`, `@Selection`, `@ForeignKey`, `#sql`, `#bind`

From **Dependencies**: `@Dependency`, `prepareDependencies`, `DependencyValues`

For usage patterns of these types, see `/skill sqlitedata-swift-core`.

---

## Property Wrappers

### FetchAll<Element: Sendable>

Fetches a collection of rows from SQLite with reactive observation.

```swift
@dynamicMemberLookup
@propertyWrapper
public struct FetchAll<Element: Sendable>: Sendable, DynamicProperty
```

**Initializers:**
```swift
// Fetch all rows from table (default order)
init(wrappedValue: [Element] = [], database: (any DatabaseReader)? = nil)
  where Element: Table, Element.QueryOutput == Element

// From a SelectStatement (query builder)
init<S: SelectStatement>(wrappedValue: [Element] = [], _ statement: S,
  database: (any DatabaseReader)? = nil)

// From any Statement<V>
init<V: QueryRepresentable>(wrappedValue: [Element] = [],
  _ statement: some Statement<V>, database: (any DatabaseReader)? = nil)

// With animation (iOS 17+)
init(..., animation: Animation)

// With custom scheduler
init(..., scheduler: some ValueObservationScheduler & Hashable)
```

**Properties:**
```swift
var wrappedValue: [Element]           // The fetched data
var projectedValue: Self              // Access to wrapper state ($items)
var loadError: (any Error)?           // Last error
var isLoading: Bool                   // Loading state
var publisher: some Publisher<[Element], Never>  // Combine publisher
var sharedReader: SharedReader<[Element]>        // Underlying reader
```

**Methods:**
```swift
func load() async throws                              // Reload current query
func load<S>(_ statement: S, database:) async throws -> FetchSubscription  // Load new query
```

---

### FetchOne<Value: Sendable>

Fetches a single value (aggregate, first row, etc.) with reactive observation.

```swift
@dynamicMemberLookup
@propertyWrapper
public struct FetchOne<Value: Sendable>: Sendable, DynamicProperty
```

Same initializer patterns as `FetchAll` but for single values. Always requires a default `wrappedValue`.

---

### Fetch<Value: Sendable>

Fetches custom data via `FetchKeyRequest` for multi-query transactions.

```swift
@dynamicMemberLookup
@propertyWrapper
public struct Fetch<Value: Sendable>: Sendable, DynamicProperty
```

**Initializers:**
```swift
// From FetchKeyRequest
init(wrappedValue: Value, _ request: some FetchKeyRequest<Value>,
  database: (any DatabaseReader)? = nil)

// With animation (iOS 17+)
init(wrappedValue: Value, _ request: some FetchKeyRequest<Value>,
  database: (any DatabaseReader)? = nil, animation: Animation)

// With custom scheduler
init(wrappedValue: Value, _ request: some FetchKeyRequest<Value>,
  database: (any DatabaseReader)? = nil, scheduler: some ValueObservationScheduler & Hashable)
```

**Methods:**
```swift
func load(_ request: some FetchKeyRequest<Value>, database:) async throws -> FetchSubscription
```

---

## Protocols

### FetchKeyRequest

```swift
public protocol FetchKeyRequest<Value>: Hashable, Sendable {
  associatedtype Value
  func fetch(_ db: Database) throws -> Value
}
```

---

## FetchSubscription

```swift
public struct FetchSubscription: Sendable {
  public var task: Void { get async throws }
  public func cancel()
}
```

---

## Database Setup

### defaultDatabase

```swift
public func defaultDatabase(
  path: String? = nil,
  configuration: Configuration = Configuration()
) throws -> any DatabaseWriter
```

Context-aware:
- **Live:** `DatabasePool` in Application Support
- **Preview/Test:** `DatabasePool` at temporary path

### DependencyValues Extensions

```swift
extension DependencyValues {
  public var defaultDatabase: any DatabaseWriter { get set }
  // CloudKit only:
  public var defaultSyncEngine: SyncEngine { get set }
}
```

---

## SyncEngine (iOS 17+)

Wraps Apple's `CKSyncEngine`. For the underlying CloudKit sharing model and CKRecord.ID mapping, see the sharing ref section in this reference.

```swift
@available(iOS 17, macOS 14, tvOS 17, watchOS 10, *)
public final class SyncEngine: Observable, Sendable
```

### Initialization

```swift
public convenience init<each T1: PrimaryKeyedTable, each T2: PrimaryKeyedTable>(
  for database: any DatabaseWriter,
  tables: repeat (each T1).Type,              // Shareable tables
  privateTables: repeat (each T2).Type,       // Private-only tables
  containerIdentifier: String? = nil,          // CloudKit container
  defaultZone: CKRecordZone = .defaultZone,
  startImmediately: Bool? = nil,               // Default: true
  delegate: (any SyncEngineDelegate)? = nil,
  logger: Logger = .disabled
) throws
```

### State (all @Observable)

```swift
public var isRunning: Bool { get }
public var isSendingChanges: Bool { get }
public var isFetchingChanges: Bool { get }
public var isSynchronizing: Bool { get }  // isSending || isFetching
```

### Control Methods

```swift
public func start() async throws
public func stop()
public func fetchChanges(_ options: CKSyncEngine.FetchChangesOptions) async throws
public func sendChanges(_ options: CKSyncEngine.SendChangesOptions) async throws
public func syncChanges(
  fetchOptions: CKSyncEngine.FetchChangesOptions,
  sendOptions: CKSyncEngine.SendChangesOptions
) async throws
public func syncChanges() async throws  // Convenience (default options)
public func deleteLocalData() async throws
```

### Sharing

For CloudKit's sharing model (CKShare, participants, permissions, UICloudSharingController): the sharing ref section in this reference

```swift
public func share<T: PrimaryKeyedTable>(
  record: T,
  configure: @Sendable (CKShare) -> Void
) async throws -> SharedRecord

public func unshare<T: PrimaryKeyedTable>(record: T) async throws
public func acceptShare(metadata: CKShare.Metadata) async throws
```

### Database Integration

```swift
public func attachMetadatabase(containerIdentifier: String? = nil) throws
// Called on Database instance in prepareDatabase

public static func migratePrimaryKeys<each T: PrimaryKeyedTable>(
  _ db: Database,
  tables: repeat (each T).Type,
  dropUniqueConstraints: Bool = false,
  uuid: (any ScalarDatabaseFunction<(), UUID>)? = nil
) throws
```

### Static Properties

```swift
public static let writePermissionError: String
  // "co.pointfree.SQLiteData.CloudKit.write-permission-error"
public static let invalidRecordNameError: String
  // "co.pointfree.SQLiteData.CloudKit.invalid-record-name-error"

// SQL expression (for triggers):
public static var isSynchronizing: Bool  // Swift property
public static var $isSynchronizing       // SQL expression for use in #sql / triggers
```

---

## SyncEngineDelegate

```swift
public protocol SyncEngineDelegate: AnyObject, Sendable {
  func syncEngine(
    _ syncEngine: SyncEngine,
    accountChanged changeType: CKSyncEngine.Event.AccountChange.ChangeType
  ) async
}
```

---

## SyncMetadata

Full struct definition and joining patterns: see the cloudkit section in this reference §6.

Key lookup types:
```swift
SyncMetadata.ID          // Composite key: recordPrimaryKey + recordType
SyncMetadata.ParentID    // Parent record reference
```

All `PrimaryKeyedTable` types have:
```swift
extension PrimaryKeyedTableDefinition {
  var syncMetadataID: SyncMetadata.ID { get }
}
```

---

## SharedRecord

Contains the `CKShare` returned from `SyncEngine.share()`. The `id` is a `CKRecord.ID` (see the sharing ref section in this reference).

```swift
public struct SharedRecord: Hashable, Identifiable, Sendable {
  public let share: CKShare
  public var id: CKRecord.ID { share.recordID }
}
```

---

## IdentifierStringConvertible

For custom identifier types (non-UUID):
```swift
public protocol IdentifierStringConvertible {
  var identifierString: String { get }
  init?(identifierString: String)
}
```

UUID conforms by default.

---

## Test Support (SQLiteDataTestSupport)

```swift
public func assertQuery<V: QueryRepresentable, S: Statement<V>>(
  includeSQL: Bool = false,
  _ query: S,
  database: (any DatabaseWriter)? = nil,
  sql: (() -> String)? = nil,
  results: (() -> String)? = nil,
  // + source location params
)
```

Usage:
```swift
@Test
func queryResults() throws {
  try assertQuery(
    Item.order(by: \.title),
    results: {
      """
      ┌─────────────────────┐
      │ "Buy groceries"     │
      │ "Call accountant"   │
      └─────────────────────┘
      """
    }
  )
}
```

---

## Advanced Patterns

---

## Platform Availability

- iOS 13+ / macOS 10.15+ / tvOS 13+ / watchOS 7+ — Core library
- iOS 17+ / macOS 14+ / tvOS 17+ / watchOS 10+ — SyncEngine (CloudKit)
- Swift 6.0 with strict concurrency

## Package Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| GRDB.swift | 7.6.0+ | SQLite wrapper |
| swift-structured-queries | 0.31.0+ | Type-safe SQL builder |
| swift-sharing | 2.3.0+ | SharedReader observation |
| swift-dependencies | 1.9.0+ | Dependency injection |
| swift-perception | 2.0.0+ | Observation backport |
| swift-collections | — | OrderedCollections |
| swift-concurrency-extras | — | Async utilities |
| swift-tagged | 0.10.0 | Tagged types (optional) |

---

## Custom Database Functions

```swift
@DatabaseFunction
nonisolated func createDefaultList() {
  Task {
    @Dependency(\.defaultDatabase) var database
    try await database.write { db in
      try List.insert { List.Draft(title: "Personal") }.execute(db)
    }
  }
}

// Register in prepareDatabase:
configuration.prepareDatabase { db in
  db.add(function: $createDefaultList)
}
```

## Seeding Data (DEBUG only)

```swift
#if DEBUG
extension DatabaseWriter {
  func seedSampleData() throws {
    try write { db in
      try db.seed {
        Item(id: uuid(), title: "Groceries", listID: listIDs[0])
        Item(id: uuid(), title: "Haircut", listID: listIDs[0])
      }
    }
  }
}
#endif
```

## Updates Extension Pattern

```swift
extension Updates<Reminder> {
  mutating func toggleStatus() {
    self.status = Case(self.status)
      .when(#bind(.incomplete), then: #bind(.completing))
      .else(#bind(.incomplete))
  }
}
```

## FTS5 Full-Text Search

```swift
@Table
struct ReminderText: FTS5 {
  let rowid: Int
  let title: String
  let notes: String
  let tags: String
}
```

Schema: `CREATE VIRTUAL TABLE "reminderTexts" USING fts5("title", "notes", "tags", tokenize = 'trigram')`

Keep FTS in sync via triggers on the source table.

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
1. Enable **iCloud** capability → check **CloudKit** (see the cloudkit setup section in this reference Step 1)
2. Enable **Background Modes** → check **Remote notifications** (see the cloudkit setup section in this reference Step 2)
3. Add `CKSharingSupported = true` to Info.plist (if sharing — see the sharing ref section in this reference)
4. Before shipping: deploy schema to production (see the cloudkit setup section in this reference Step 3)

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

Your `@Table` UUID primary key becomes a `CKRecord.ID` record name in CloudKit — ASCII, max 255 chars, unique per zone (see the sharing ref section in this reference for the underlying CloudKit constraints).

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

These are `CKRecord` system metadata fields (see the sharing ref section in this reference for full list). Do not use as column names:

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

CloudKit schemas are additive-only once deployed to production (see the cloudkit setup section in this reference Step 3):
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

This enables joining `SyncMetadata` to your tables to access `CKRecord` metadata and `CKShare` data (see the sharing ref section in this reference).

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

SQLiteData wraps CloudKit's sharing API (`CKShare`, `UICloudSharingController`). For Apple's underlying sharing model — record zones vs hierarchies, participant management, permission types, and UICloudSharingController sample code — see the sharing ref section in this reference.

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

When a user taps a share URL, CloudKit provides `CKShare.Metadata` to your app delegate. SQLiteData simplifies acceptance — for the full CloudKit acceptance flow, see the sharing ref section in this reference.

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

Simulators don't receive push notifications (the `remote-notification` background mode — see the cloudkit setup section in this reference Step 2), so:
- Changes don't auto-sync from CloudKit to simulator
- Force sync: kill and relaunch the app, or use `syncEngine.syncChanges()`

## Common CloudKit Mistakes

1. **Integer primary keys** — Must be UUID TEXT for distributed sync (see the sharing ref section in this reference)
2. **UNIQUE constraints** on non-PK columns — Not allowed with sync
3. **NOT NULL without ON CONFLICT REPLACE** — Breaks cross-version sync
4. **RESTRICT/NO ACTION foreign keys** — Not supported
5. **Editing deployed migrations** — Always add new migrations (see the cloudkit setup section in this reference Step 3)
6. **Removing/renaming columns** — Not allowed with distributed schema
7. **Not attaching metadatabase** — Required to query SyncMetadata
8. **Using reserved CloudKit field names** as column names

## Apple Documentation Skills

For Apple's CloudKit documentation (no web search needed):
- the cloudkit setup section in this reference — iCloud capability, background modes, schema deployment
- the sharing ref section in this reference — CKShare, CKRecord.ID, UICloudSharingController, permissions
- the swiftdata sync section in this reference — SwiftData sync (for comparison/migration)

---

# CloudKit Setup for SQLiteData

Complete setup guide for CloudKit sync with SQLiteData — from Xcode capabilities through production deployment.

## Step 1: Enable iCloud Capability

1. Add capability: follow Apple's "Adding capabilities to your app" guide
2. Select **iCloud** from Xcode's Capabilities library
3. In the **Services** section, check **CloudKit**
4. Xcode adds these entitlements automatically:
   - `com.apple.developer.icloud-services`
   - Push Notifications capability (CloudKit uses push to notify of server changes)

> Removing the iCloud capability in Xcode does **not** auto-disable it in your developer account — you must do that manually.

### iCloud Services Overview

| Service | Use Case | Storage |
|---------|----------|---------|
| **Key-value storage** | Small data (preferences), up to 1 MB / 1024 pairs | `NSUbiquitousKeyValueStore` |
| **iCloud Documents** | File-based sync via `UIDocument`/`NSDocument` | Ubiquity container (on-disk) |
| **CloudKit** | Structured data with full schema control + sharing | `CKContainer` databases |

**For SQLiteData apps, enable CloudKit.**

### Managing Containers

After adding iCloud capability, Xcode fetches existing containers from your developer account.

**To create a new container:**
1. Click **Add** (+) below the containers list
2. Enter name: must start with `iCloud.` and use reverse DNS (e.g., `iCloud.com.example.myapp`)
3. Click **OK**

**For SQLiteData**, pass it to SyncEngine:
```swift
$0.defaultSyncEngine = try SyncEngine(
    for: $0.defaultDatabase,
    tables: ...,
    containerIdentifier: "iCloud.com.example.myapp"  // nil = auto from entitlements
)
```

## Step 2: Enable Remote Notifications Background Mode

1. Select your project in Xcode's Project navigator
2. Select the app target → **Signing & Capabilities**
3. Add **Background Modes** capability (if not present)
4. Check **Remote notifications**

This allows CloudKit to silently notify your app of server-side changes, which `SyncEngine` uses to trigger incremental sync.

> Use sparingly — overuse impacts battery life and device performance.

### All Background Modes Reference

| Mode | Info.plist Value | Platforms |
|------|-----------------|-----------|
| Audio, AirPlay, PiP | `audio` | iOS, iPadOS, tvOS, visionOS |
| Location updates | `location` | iOS, iPadOS, watchOS |
| Voice over IP | `voip` | iOS, iPadOS, visionOS, watchOS |
| External accessory | `external-accessory` | iOS, iPadOS |
| Bluetooth LE central | `bluetooth-central` | iOS, iPadOS, visionOS |
| Bluetooth LE peripheral | `bluetooth-peripheral` | iOS, iPadOS |
| Background fetch | `fetch` | iOS, iPadOS, tvOS, visionOS |
| **Remote notifications** | **`remote-notification`** | **iOS, iPadOS, tvOS, visionOS, watchOS** |
| Background processing | `processing` | iOS, iPadOS, tvOS, visionOS |

## Step 3: Deploy Schema to Production

During development, you create your schema and test in the **development environment**. Apps in the App Store access only the **production environment**. Before publishing, deploy the development schema to production.

Key rules:
- Every deploy merges **additive changes** into production
- You **cannot delete** record types or fields already in production
- Apps in development can access either environment

### Reset the Development Environment

Resets all records in the development environment. If schema isn't in production, also deletes all record types.

**Steps:**
1. Sign in to [CloudKit Console](https://icloud.developer.apple.com/)
2. Select **CloudKit Database** app → your container
3. Select **Reset Environment** (left sidebar)
4. Read the warning, check the box, click **Reset**

### Deploy the Development Schema

Copies record types, fields, and indexes to production — but **not records**.

> **Permissions:** You need admin privileges. Individual developers are automatically admin.

**Steps:**
1. Sign in to [CloudKit Console](https://icloud.developer.apple.com/)
2. Select **CloudKit Database** app → your container
3. Select **Deploy Schema Changes** (left sidebar)
4. Review pending changes, click **Deploy**

## CloudKit Console Access

- Click **CloudKit Console** button in Xcode's iCloud capability section
- Or go directly to [icloud.developer.apple.com](https://icloud.developer.apple.com/)
- Use to manage schemas, inspect data, view operation logs, and performance telemetry

---

# CloudKit Sharing Reference

Apple's CloudKit sharing model, CKRecord.ID mapping, and implementation code.

## CKRecord.ID

`CKRecord.ID` = **record name** (String) + **zone ID** (`CKRecordZone.ID`)

**Record name constraints:**
- ASCII string, max **255 characters**
- Custom names must be unique **within the zone**
- Record IDs are unique **per database**

> **SQLiteData mapping:** Your `@Table` struct's `id: UUID` becomes the `recordName`. This is why SQLiteData requires UUID primary keys — they satisfy CloudKit's uniqueness requirement across devices.

### Initializers

```swift
convenience init(recordName: String)
convenience init(recordName: String, zoneID: CKRecordZone.ID)
```

### Properties

```swift
var recordName: String
var zoneID: CKRecordZone.ID
```

### Related Metadata on CKRecord

| Property | Type | Description |
|----------|------|-------------|
| `recordID` | `CKRecord.ID` | Unique ID |
| `recordType` | `String` | App-defined type name |
| `creationDate` | `Date?` | First saved to server |
| `modificationDate` | `Date?` | Last saved to server |
| `recordChangeTag` | `String?` | Server change token |

> These metadata fields are available via `SyncMetadata.lastKnownServerRecord` when you attach the metadatabase.

### Cross-Zone References

`CKRecord.Reference` only works within a single zone. To reference records across zones:
1. Save the `recordName` and zone ID strings
2. Recreate `CKRecord.ID` and `CKRecordZone.ID` when needed

## Sharing Model

The **owner** shares records from their private database. **Participants** see shared records in their shared database.

Two sharing modes:
- **Record zone sharing** — shares ALL records in a custom zone
- **Record hierarchy sharing** — shares a root record and its descendants

> **SQLiteData uses record hierarchy sharing** — `SyncEngine.share(record:)` shares a root record and its one-foreign-key descendants.

### Creating a Share

| Approach | Use | CKShare Init |
|----------|-----|-------------|
| Zone sharing | All records in a zone | `CKShare(recordZoneID:)` |
| Hierarchy sharing | Root record + descendants | `CKShare(rootRecord:)` |

### Share Lifecycle

1. **Create** — `CKShare(rootRecord:)` or `CKShare(recordZoneID:)`
2. **Save** — `CKModifyRecordsOperation`
3. **Invite** — Distribute via `UICloudSharingController` (iOS) or `NSSharingService` (macOS)
4. **Accept** — Recipient taps URL → system provides `CKShare.Metadata` → confirm with `CKAcceptSharesOperation`
5. **Manage** — Owner can stop sharing; participant can leave; remove via `removeParticipant(_:)`

> **SQLiteData equivalents:** `syncEngine.share(record:)`, `syncEngine.acceptShare(metadata:)`, `syncEngine.unshare(record:)`

**Key Info.plist requirement:**
```xml
<key>CKSharingSupported</key>
<true/>
```
Required for the system to launch your app when a user taps a share URL.

### Permissions

| Permission | Meaning |
|-----------|---------|
| `.readOnly` | Participant can view but not modify |
| `.readWrite` | Participant can modify shared records |
| `.none` | Private share (invited only) |
| public share | Anyone with URL can join |

> **SQLiteData:** Write permission is enforced automatically. Catch `SyncEngine.writePermissionError` on `DatabaseError`.

## UICloudSharingController Implementation

### Prerequisites

- `CKSharingSupported = true` in Info.plist
- iCloud capability with CloudKit enabled
- Both devices signed in with different iCloud accounts

### Sharing an unshared record

```swift
let sharingController = UICloudSharingController { (_, prepareCompletionHandler) in
    let shareID = CKRecord.ID(recordName: UUID().uuidString, zoneID: zone.zoneID)
    var share = CKShare(rootRecord: unsharedRootRecord, shareID: shareID)
    share[CKShare.SystemFieldKey.title] = "A cool topic to share!" as CKRecordValue
    share.publicPermission = .readWrite

    let op = CKModifyRecordsOperation(recordsToSave: [share, unsharedRootRecord], recordIDsToDelete: nil)
    // ... save and call prepareCompletionHandler
}
```

### Managing an existing share

```swift
let sharingController = UICloudSharingController(share: share, container: container)
```

### Presenting the controller

```swift
sharingController.delegate = self
sharingController.availablePermissions = [.allowPublic, .allowReadOnly, .allowReadWrite]
present(sharingController, animated: true)
```

### UICloudSharingControllerDelegate

| Method | When Called | Action |
|--------|-----------|--------|
| `cloudSharingControllerDidSaveShare(_:)` | Share created successfully | Fetch changes, update cache |
| `cloudSharingControllerDidStopSharing(_:)` | User stopped sharing | Fetch changes, update cache |
| `cloudSharingController(_:failedToSaveShareWithError:)` | Save failed | Alert error |

### Record Hierarchies (Parent References)

Child records are automatically shared with their parent:
```swift
newNoteRecord.parent = CKRecord.Reference(record: topicRecord, action: .none)
```

## Local Caching with Change Tokens

### Database-level changes

```swift
let op = CKFetchDatabaseChangesOperation(previousServerChangeToken: token)
op.changeTokenUpdatedBlock = { newToken in
    self.setServerChangeToken(newToken: newToken, cloudKitDB: cloudKitDB)
}
```

### Zone-level changes

```swift
let config = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
config.previousServerChangeToken = getServerChangeToken()
let op = CKFetchRecordZoneChangesOperation(
    recordZoneIDs: [zone.zoneID],
    configurationsByRecordZoneID: [zone.zoneID: config]
)
```

## Key CloudKit Types

| Type | Purpose |
|------|---------|
| `CKShare` | Manages a collection of shared records |
| `CKShare.Metadata` | Describes shared record metadata (provided on accept) |
| `CKShare.Participant` | Describes a user's participation |
| `UICloudSharingController` | Standard sharing UI (iOS) |
| `CKRecord.ID` | Unique record identifier (name + zone) |
| `CKFetchShareMetadataOperation` | Fetch share metadata from URL |
| `CKAcceptSharesOperation` | Confirm participation |

---

# Syncing Model Data Across a Person's Devices (SwiftData)

Apple's guide for SwiftData automatic CloudKit synchronization.

## Required Capabilities

SwiftData requires **two** Xcode capabilities for iCloud sync:

1. **iCloud** capability — enable CloudKit, select/create a container
2. **Background Modes** capability — enable **Remote notifications**

> See the cloudkit setup section in this reference for step-by-step setup.

## CloudKit Schema Limitations

SwiftData macros generate schemas that may not be CloudKit-compatible:

| SwiftData Macro | CloudKit Limitation |
|----------------|---------------------|
| `@Attribute(.unique)` | CloudKit **cannot enforce** unique constraints (concurrent sync) |
| `@Relationship` | All relationships **must be optional** (CloudKit doesn't guarantee atomic processing). Set inverse explicitly if it can't be inferred. `.deny` delete rule not supported. |

> **SQLiteData parallel:** These same constraints apply — no UNIQUE constraints on synced tables, and foreign keys must use CASCADE/SET NULL/SET DEFAULT (not RESTRICT/NO ACTION).

## Schema Initialization (Development Only)

SwiftData uses `NSPersistentCloudKitContainer` under the hood. To initialize the CloudKit schema during development:

```swift
#if DEBUG
try autoreleasepool {
    let desc = NSPersistentStoreDescription(url: config.url)
    let opts = NSPersistentCloudKitContainerOptions(
        containerIdentifier: "iCloud.com.example.Trips"
    )
    desc.cloudKitContainerOptions = opts
    desc.shouldAddStoreAsynchronously = false

    if let mom = NSManagedObjectModel.makeManagedObjectModel(for: [Trip.self, Accommodation.self]) {
        let container = NSPersistentCloudKitContainer(name: "Trips", managedObjectModel: mom)
        container.persistentStoreDescriptions = [desc]
        container.loadPersistentStores { _, err in
            if let err { fatalError(err.localizedDescription) }
        }
        try container.initializeCloudKitSchema()
        if let store = container.persistentStoreCoordinator.persistentStores.first {
            try container.persistentStoreCoordinator.remove(store)
        }
    }
}
#endif
```

> **SQLiteData doesn't need this** — SyncEngine automatically creates CloudKit record types from your SQL schema.

## Container Configuration

SwiftData auto-discovers the container from `Entitlements.plist`. To use a specific container:
```swift
let config = ModelConfiguration(cloudKitDatabase: .private("iCloud.com.example.Trips"))
```

To **disable** automatic sync (e.g., app already uses CloudKit directly):
```swift
let config = ModelConfiguration(cloudKitDatabase: .none)
```

## Schemas Are Additive Only

Once deployed to production, you **cannot**:
- Delete model types
- Change existing model attributes

This matches SQLiteData's constraint: no removing/renaming columns or tables in deployed migrations.

## Related Skills

- the cloudkit section in this reference — SQLiteData's CloudKit sync (the replacement for SwiftData sync)
- the cloudkit setup section in this reference — Configuring iCloud capability and deploying schema to production
