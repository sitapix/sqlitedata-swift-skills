---
name: sqlitedata-swift-cloudkit-sharing
description: Use when implementing sharing UI, understanding CKShare lifecycle, or debugging share acceptance flow — covers UICloudSharingController code, CKShare setup, delegate methods, local caching with change tokens, and database subscriptions.
license: MIT
---

# Sharing CloudKit Data — Implementation Code

## Real questions this skill answers

- "How do I present UICloudSharingController?"
- "How do I handle CKShare acceptance in the delegate?"
- "How do I cache shared records locally with change tokens?"
- "How do I set up database subscriptions for share changes?"

---

Apple's sample code for UICloudSharingController, CKShare delegates, change tokens, and local caching.

> **This is the implementation skill.** For the conceptual overview (sharing model, zone vs hierarchy, permissions, lifecycle), see `/skill sqlitedata-swift-shared-records`. For SQLiteData's higher-level API, see `/skill sqlitedata-swift-cloudkit`.

## Prerequisites

- `CKSharingSupported = true` in Info.plist (required for accepting shares via URL)
- iCloud capability with CloudKit enabled
- Both devices signed in with different iCloud accounts
- iCloud Drive enabled on both devices

## Creating a CKShare

Two paths depending on whether the record is already shared:

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
// Fetch the existing CKShare from the server using rootRecord.share recordID
let sharingController = UICloudSharingController(share: share, container: container)
```

### Presenting the controller
```swift
sharingController.delegate = self
sharingController.availablePermissions = [.allowPublic, .allowReadOnly, .allowReadWrite]
present(sharingController, animated: true)
```

## UICloudSharingControllerDelegate

Implement these to keep local cache consistent with server:

| Method | When Called | Action |
|--------|-----------|--------|
| `cloudSharingControllerDidSaveShare(_:)` | Share created successfully | Fetch changes, update cache |
| `cloudSharingControllerDidStopSharing(_:)` | User stopped sharing | Fetch changes, update cache |
| `cloudSharingController(_:failedToSaveShareWithError:)` | Save failed | Alert error, update cached root record |

## Record Hierarchies (Parent References)

Child records are automatically shared with their parent:
```swift
newNoteRecord.parent = CKRecord.Reference(record: topicRecord, action: .none)
```

## Local Caching with Change Tokens

> **SQLiteData note:** `SyncEngine` handles all change token tracking, zone fetching, and push-driven sync internally. The patterns below are Apple's raw CloudKit API — useful for understanding what SyncEngine does under the hood, but you do not need to write this code when using SQLiteData.

### Database-level changes (zones)
```swift
let token = getServerChangeToken(for: cloudKitDB)
let op = CKFetchDatabaseChangesOperation(previousServerChangeToken: token)
op.changeTokenUpdatedBlock = { newToken in
    self.setServerChangeToken(newToken: newToken, cloudKitDB: cloudKitDB)
}
```

### Zone-level changes (records)
```swift
let config = CKFetchRecordZoneChangesOperation.ZoneConfiguration()
config.previousServerChangeToken = getServerChangeToken()
let op = CKFetchRecordZoneChangesOperation(
    recordZoneIDs: [zone.zoneID],
    configurationsByRecordZoneID: [zone.zoneID: config]
)
```

### Push-driven incremental sync
```swift
// Subscribe to database changes
let subscription = CKDatabaseSubscription(subscriptionID: subscriptionID)
let notificationInfo = CKSubscription.NotificationInfo()
notificationInfo.shouldBadge = true
subscription.notificationInfo = notificationInfo

let op = CKModifySubscriptionsOperation(subscriptionsToSave: [subscription], subscriptionIDsToDelete: nil)
```

## Threading

- CloudKit operations and callbacks must run on a secondary queue
- Serialize data access with a dispatch queue for thread safety
- Keep updates fast to avoid blocking the main queue

## Related Skills

- `/skill sqlitedata-swift-cloudkit` — SQLiteData's higher-level sharing API (SyncEngine.share/unshare/acceptShare)
- `/skill sqlitedata-swift-shared-records` — CloudKit Shared Records API overview
- `/skill sqlitedata-swift-ckrecord-id` — CKRecord.ID reference
