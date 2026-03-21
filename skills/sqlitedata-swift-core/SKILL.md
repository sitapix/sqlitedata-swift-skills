---
name: sqlitedata-swift-core
description: Use when building with SQLiteData or learning core patterns — covers @Table models, @FetchAll/@FetchOne/@Fetch property wrappers, FetchKeyRequest, database setup, migrations, dependency injection, and query building with StructuredQueries
license: MIT
---

# SQLiteData Core Patterns

## Real questions this skill answers

- "How do I define a @Table model with SQLiteData?"
- "How do I use @FetchAll to show a live-updating list?"
- "How do I set up the database with prepareDependencies?"
- "How do I write a migration to add a column?"
- "What's the difference between @FetchAll, @FetchOne, and @Fetch?"
- "How do I do a join query with StructuredQueries?"

---

You are working with **SQLiteData** (by Point-Free), a fast, lightweight replacement for SwiftData powered by SQLite via GRDB. This skill covers the core patterns for using the library.

## Architecture Overview

SQLiteData is built on:
- **GRDB** (7.6.0+) — SQLite wrapper
- **StructuredQueries** — Type-safe SQL query builder (`@Table`, `@Column`, `@Selection`, `#sql`)
- **swift-sharing** — `SharedReader` for reactive observation
- **swift-dependencies** — Dependency injection (`@Dependency`, `prepareDependencies`)

The library re-exports key GRDB types: `Database`, `DatabaseWriter`, `DatabaseReader`, `DatabaseQueue`, `DatabasePool`, `Configuration`, `DatabaseMigrator`, `DatabaseError`, `ValueObservationScheduler`.

It also re-exports `StructuredQueriesSQLite` (which gives `@Table`, `@Column`, `@Selection`, `#sql`, query builders).

## 1. Model Definition with @Table

Models are plain Swift structs decorated with the `@Table` macro:

```swift
@Table
nonisolated struct Item: Identifiable {
  let id: UUID
  var title: String = ""
  var isCompleted: Bool = false
  var position: Int = 0
  var dueDate: Date?
  var listID: RemindersList.ID  // Foreign key
}
```

**Key rules:**
- Use `nonisolated` before the struct for strict concurrency
- `let id: UUID` — primary key (auto-generated `Draft` type omits it)
- Default values map to SQL defaults
- Optional properties map to nullable columns
- The macro generates: `Item.Draft` (for inserts), `Item.TableColumns`, `Item.Columns`, query builders

**Custom column options:**
```swift
@Column(primaryKey: true)      // Non-standard primary key
let remindersListID: RemindersList.ID

@Column(as: Color.HexRepresentation.self)  // Custom coding
var color: Color = .blue
```

**Custom table name:**
```swift
@Table("remindersTags")
nonisolated struct ReminderTag: Identifiable { ... }
```

## 2. @Selection for Custom Projections

Use `@Selection` to define custom types that hold query results from joins or aggregates:

```swift
@Selection
struct ReminderListState: Identifiable {
  var id: RemindersList.ID { remindersList.id }
  var remindersCount: Int
  var remindersList: RemindersList
  @Column(as: CKShare?.SystemFieldsRepresentation.self)
  var share: CKShare?
}

@Selection
struct Stats {
  var allCount = 0
  var flaggedCount = 0
  var scheduledCount = 0
  var todayCount = 0
}
```

The macro generates a `.Columns(...)` initializer used in `.select { }` clauses.

## 3. Database Setup

### Step-by-step setup:

```swift
import OSLog
import SQLiteData

func appDatabase() throws -> any DatabaseWriter {
  @Dependency(\.context) var context
  var configuration = Configuration()
  configuration.foreignKeysEnabled = true  // If using foreign keys

  // Optional: attach metadatabase for CloudKit metadata queries
  // (enables joining SyncMetadata for CKRecord/CKShare data — see /skill sqlitedata-swift-cloudkit §5)
  configuration.prepareDatabase { db in
    try db.attachMetadatabase()
  }

  // Optional: query tracing in DEBUG
  #if DEBUG
    configuration.prepareDatabase { db in
      db.trace(options: .profile) {
        if context == .preview {
          print("\($0.expandedDescription)")
        } else {
          logger.debug("\($0.expandedDescription)")
        }
      }
    }
  #endif

  let database = try defaultDatabase(configuration: configuration)

  // Migrations
  var migrator = DatabaseMigrator()
  #if DEBUG
    migrator.eraseDatabaseOnSchemaChange = true
  #endif

  migrator.registerMigration("Create tables") { db in
    try #sql("""
      CREATE TABLE "items" (
        "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid()),
        "title" TEXT NOT NULL ON CONFLICT REPLACE DEFAULT '',
        "isCompleted" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0,
        "position" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0,
        "dueDate" TEXT,
        "listID" TEXT NOT NULL REFERENCES "lists"("id") ON DELETE CASCADE
      ) STRICT
      """).execute(db)
  }

  try migrator.migrate(database)
  return database
}

private let logger = Logger(subsystem: "MyApp", category: "Database")
```

### Entry point setup:

```swift
@main
struct MyApp: App {
  init() {
    prepareDependencies {
      $0.defaultDatabase = try! appDatabase()
    }
  }
  var body: some Scene { ... }
}
```

### Preview setup:
```swift
#Preview {
  let _ = prepareDependencies {
    $0.defaultDatabase = try! appDatabase()
  }
  ContentView()
}
```

### Test setup:
```swift
@Suite(.dependency(\.defaultDatabase, try! appDatabase()))
struct MyTests { ... }
```

## 4. Schema Design (SQL)

**Always use raw SQL for table definitions** (they are frozen in time):

```sql
CREATE TABLE "items" (
  "id" TEXT PRIMARY KEY NOT NULL ON CONFLICT REPLACE DEFAULT (uuid()),
  "title" TEXT NOT NULL ON CONFLICT REPLACE DEFAULT '',
  "isCompleted" INTEGER NOT NULL ON CONFLICT REPLACE DEFAULT 0,
  "priority" INTEGER,
  "listID" TEXT NOT NULL REFERENCES "lists"("id") ON DELETE CASCADE
) STRICT
```

**Critical rules:**
- Use `STRICT` mode for type safety
- `NOT NULL ON CONFLICT REPLACE DEFAULT <value>` — required for CloudKit sync compatibility (see `/skill sqlitedata-swift-cloudkit` §3)
- UUID primary keys via `DEFAULT (uuid())` — maps to `CKRecord.ID` in CloudKit (see `/skill sqlitedata-swift-ckrecord-id`)
- Foreign keys with `REFERENCES` and `ON DELETE CASCADE`
- FTS5 for full-text search: `CREATE VIRTUAL TABLE ... USING fts5(...)`
- Foreign key indexes: `CREATE INDEX IF NOT EXISTS "idx_items_listID" ON "items"("listID")`

## 5. @FetchAll — Fetch Collections

```swift
// Fetch all items (default order)
@FetchAll var items: [Item]

// With query
@FetchAll(Item.order(by: \.title))
var items

// Complex query with join and select
@FetchAll(
  RemindersList
    .group(by: \.id)
    .order(by: \.position)
    .leftJoin(Reminder.all) { $0.id.eq($1.remindersListID) && !$1.isCompleted }
    .select {
      ListState.Columns(
        remindersCount: $1.id.count(),
        remindersList: $0
      )
    },
  animation: .default
)
var lists

// With animation (iOS 17+)
@FetchAll(Item.order(by: \.title), animation: .default)
var items
```

**Properties available:**
- `wrappedValue: [Element]` — the data
- `$items.loadError` — last error
- `$items.isLoading` — loading state
- `$items.publisher` — Combine publisher
- `$items.load(newQuery)` — reload with different query

**Dynamic queries via load:**
```swift
.task {
  try await $items.load(Item.where { $0.isCompleted == showCompleted })
}
```

## 6. @FetchOne — Fetch Single Values/Aggregates

```swift
// Count
@FetchOne(Reminder.count())
var remindersCount = 0

// Filtered count
@FetchOne(Reminder.where(\.isCompleted).count())
var completedCount = 0

// Complex aggregate with @Selection
@FetchOne(
  Reminder.select {
    Stats.Columns(
      allCount: $0.count(filter: !$0.isCompleted),
      flaggedCount: $0.count(filter: $0.isFlagged && !$0.isCompleted),
      scheduledCount: $0.count(filter: $0.isScheduled),
      todayCount: $0.count(filter: $0.isToday)
    )
  }
)
var stats = Stats()
```

## 7. @Fetch — Multiple Queries in One Transaction

For bundling multiple queries into a single database transaction:

```swift
struct PlayersRequest: FetchKeyRequest {
  struct Value {
    let injuredPlayerCount: Int
    let players: [Player]
  }
  func fetch(_ db: Database) throws -> Value {
    try Value(
      injuredPlayerCount: Player.where(\.isInjured).fetchCount(db),
      players: Player
        .where { !$0.isInjured }
        .order(by: \.name)
        .limit(10)
        .fetchAll(db)
    )
  }
}

// Usage:
@Fetch(PlayersRequest()) var response = PlayersRequest.Value()

// Access:
response.players       // [Player]
response.injuredPlayerCount  // Int
```

**FetchKeyRequest protocol:**
```swift
public protocol FetchKeyRequest<Value>: Hashable, Sendable {
  associatedtype Value
  func fetch(_ db: Database) throws -> Value
}
```

## 8. Query Building Patterns

```swift
// Basic CRUD
Item.all                          // SELECT * FROM items
Item.where { $0.isCompleted }     // WHERE isCompleted
Item.where(\.isCompleted)         // Same, shorter
Item.order(by: \.title)           // ORDER BY title
Item.order { $0.title.desc() }   // ORDER BY title DESC
Item.limit(10)                    // LIMIT 10
Item.find(someID)                 // WHERE id = ?

// Chaining
Item.where { !$0.isCompleted }
  .order(by: \.title, \.position)
  .limit(20)

// Joins
Item.join(List.all) { $0.listID.eq($1.id) }
Item.leftJoin(Tag.all) { $0.id.eq($1.itemID) }

// Group by
Item.group(by: \.id)
  .leftJoin(Tag.all) { $0.id.eq($1.itemID) }
  .having { $1.count().gt(0) }

// Aggregates
Item.count()
Item.select { $0.title.count(filter: $0.isCompleted) }

// Raw SQL via #sql macro
#sql("SELECT * FROM items WHERE isCompleted ORDER BY title DESC")
#sql("SELECT \(Item.columns) FROM \(Item.self) WHERE \(Item.isCompleted)")
```

## 9. Writing Data

```swift
@Dependency(\.defaultDatabase) var database

// Insert with Draft (omits primary key — DB generates UUID)
try database.write { db in
  try Item.insert {
    Item.Draft(title: "Get milk", listID: someListID)
  }.execute(db)
}

// Upsert
try database.write { db in
  try Item.upsert {
    Item.Draft(title: "Get milk")
  }.execute(db)
}

// Update
try database.write { db in
  try Item.find(id)
    .update { $0.title = "Updated title" }
    .execute(db)
}

// Delete
try database.write { db in
  try Item.where { $0.id.in(ids) }
    .delete()
    .execute(db)
}

// Batch update with Case expression
try database.write { db in
  try Item
    .where { $0.id.in(ids) }
    .update {
      let enumerated = Array(ids.enumerated())
      let (first, rest) = (enumerated.first!, enumerated.dropFirst())
      $0.position = rest
        .reduce(Case($0.id).when(first.element, then: first.offset)) { cases, id in
          cases.when(id.element, then: id.offset)
        }
        .else($0.position)
    }
    .execute(db)
}
```

## 10. Computed Columns (on TableColumns)

```swift
nonisolated extension Reminder.TableColumns {
  var isCompleted: some QueryExpression<Bool> {
    status.neq(Reminder.Status.incomplete)
  }
  var isPastDue: some QueryExpression<Bool> {
    @Dependency(\.date.now) var now
    return !isCompleted && #sql("coalesce(date(\(dueDate)) < date(\(now)), 0)")
  }
}
```

Use these in queries: `Reminder.where { $0.isPastDue }`

## 11. Triggers (StructuredQueries)

```swift
try Item.createTemporaryTrigger(
  after: .insert { new in
    Item.find(new.id)
      .update { $0.position = Item.select { ($0.position.max() ?? -1) + 1 } }
  }
).execute(db)

try Item.createTemporaryTrigger(
  after: .delete { old in
    ItemText.where { $0.rowid.eq(old.rowid) }.delete()
  }
).execute(db)

try Item.createTemporaryTrigger(
  after: .update { ($0.title, $0.notes) }
  forEachRow: { _, new in
    ItemText.where { $0.rowid.eq(new.rowid) }
      .update { $0.title = new.title; $0.notes = new.notes }
  }
).execute(db)
```

## 12. Custom Database Functions

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

## 13. Seeding Data (DEBUG only)

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

## 14. Enum Coding for Query Columns

```swift
enum Priority: Int, QueryBindable {
  case low = 1, medium, high
}
enum Status: Int, QueryBindable {
  case incomplete = 0, completing = 2, completed = 1
}
```

## 15. Updates Extension Pattern

```swift
extension Updates<Reminder> {
  mutating func toggleStatus() {
    self.status = Case(self.status)
      .when(#bind(.incomplete), then: #bind(.completing))
      .else(#bind(.incomplete))
  }
}
```

## 16. FTS5 Full-Text Search

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

## 17. @Observable Model Pattern

```swift
@MainActor
@Observable
class ItemsModel {
  @ObservationIgnored
  @FetchAll(Item.order(by: \.title), animation: .default)
  var items

  @ObservationIgnored
  @Dependency(\.defaultDatabase) private var database

  func delete(at offsets: IndexSet) {
    withErrorReporting {
      let ids = offsets.map { items[$0].id }
      try database.write { db in
        try Item.where { $0.id.in(ids) }.delete().execute(db)
      }
    }
  }
}
```

**Key pattern:** Use `@ObservationIgnored` on `@FetchAll`/`@FetchOne`/`@Fetch` properties in `@Observable` classes to prevent double-observation.

## Common Mistakes to Avoid

1. **Missing `nonisolated`** on `@Table` structs — causes concurrency warnings
2. **Missing `@ObservationIgnored`** on fetch wrappers in `@Observable` classes
3. **Using `NOT NULL` without `ON CONFLICT REPLACE`** in CloudKit-synced schemas (see `/skill sqlitedata-swift-cloudkit` §3, `/skill sqlitedata-swift-deploy-schema` for why schemas are additive-only)
4. **Editing frozen migrations** — always add new migrations, never modify deployed ones
5. **Missing foreign key indexes** — always create indexes on foreign key columns
6. **Forgetting `STRICT`** on table definitions
7. **Using `prepareDependencies` more than once** — only call once at app startup
