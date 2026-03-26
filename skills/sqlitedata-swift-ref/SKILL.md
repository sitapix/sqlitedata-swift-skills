---
name: sqlitedata-swift-ref
description: Use when looking up exact API signatures, init parameters, type details, or advanced patterns (FTS5, custom functions, seeding) — covers all public types, property wrappers, SyncEngine methods, and re-exported types. NOT for usage patterns (use core) or troubleshooting (use diag)
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

Wraps Apple's `CKSyncEngine`. For the underlying CloudKit sharing model and CKRecord.ID mapping, see `/skill sqlitedata-swift-sharing-ref`.

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

For CloudKit's sharing model (CKShare, participants, permissions, UICloudSharingController): `/skill sqlitedata-swift-sharing-ref`

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

Full struct definition and joining patterns: see `/skill sqlitedata-swift-cloudkit` §6.

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

Contains the `CKShare` returned from `SyncEngine.share()`. The `id` is a `CKRecord.ID` (see `/skill sqlitedata-swift-sharing-ref`).

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
