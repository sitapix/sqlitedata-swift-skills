---
name: sqlitedata-swift-swiftdata-sync
description: Use when comparing SwiftData sync to SQLiteData sync, understanding CloudKit schema limitations, or migrating from SwiftData — covers SwiftData iCloud sync setup, CloudKit-compatible schema constraints, schema initialization, and container configuration.
license: MIT
---

# Syncing Model Data Across a Person's Devices (SwiftData)

## Real questions this skill answers

- "What does SwiftData do automatically that SQLiteData does explicitly?"
- "What CloudKit schema types does SwiftData support?"
- "How do I migrate from SwiftData to SQLiteData?"

---

Apple's guide for SwiftData automatic CloudKit synchronization.

> **SQLiteData context:** SQLiteData replaces SwiftData but shares the same underlying CloudKit infrastructure. This skill is useful for understanding what SwiftData does automatically (so you know what SQLiteData's `SyncEngine` handles explicitly), and for migrating from SwiftData.

## Required Capabilities

SwiftData requires **two** Xcode capabilities for iCloud sync:

1. **iCloud** capability — enable CloudKit, select/create a container
2. **Background Modes** capability — enable **Remote notifications**

> See `/skill sqlitedata-swift-icloud-services` and `/skill sqlitedata-swift-background-modes` for step-by-step setup.

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

- `/skill sqlitedata-swift-cloudkit` — SQLiteData's CloudKit sync (the replacement for SwiftData sync)
- `/skill sqlitedata-swift-icloud-services` — Configuring iCloud capability
- `/skill sqlitedata-swift-deploy-schema` — Deploying schema to production
