---
name: sqlitedata-swift-sharing-ref
description: Use when understanding CloudKit sharing architecture, implementing sharing UI, or debugging share behavior — covers CKShare lifecycle, CKRecord.ID mapping, permissions, UICloudSharingController, share acceptance, and record hierarchies.
---

# CloudKit Sharing Reference

Apple's CloudKit sharing model, CKRecord.ID mapping, and implementation code.

> **SQLiteData context:** SQLiteData's `SyncEngine` wraps this API. Understanding CloudKit's sharing model explains why SQLiteData has specific constraints around root records, foreign keys, and sharing. For SQLiteData's higher-level sharing API, see `/skill sqlitedata-swift-cloudkit`.

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

> **SQLiteData note:** `SyncEngine` handles all change token tracking internally. The patterns below are Apple's raw CloudKit API — useful for understanding what SyncEngine does under the hood.

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
