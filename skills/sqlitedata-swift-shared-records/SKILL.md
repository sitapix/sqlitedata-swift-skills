---
name: sqlitedata-swift-shared-records
description: Use when understanding CloudKit sharing architecture or debugging share behavior — covers CKShare lifecycle, record zones vs hierarchies, inviting participants, managing permissions, and custom sharing flows.
license: MIT
---

# CloudKit Shared Records

## Real questions this skill answers

- "How does CKShare work for sharing records?"
- "What permissions can participants have?"
- "What's the difference between zone-based and hierarchy-based sharing?"
- "How does the owner vs participant model work?"

---

Apple's API overview for sharing CloudKit records with other iCloud users.

> **SQLiteData context:** SQLiteData's `SyncEngine` wraps this API. Understanding CloudKit's sharing model helps explain why SQLiteData has specific constraints around root records, foreign keys, and sharing. See `/skill sqlitedata-swift-cloudkit` for the SQLiteData-specific patterns.

## Sharing Model

The **owner** shares records from their private database. **Participants** see shared records in their shared database (a view into the owner's private database).

Two sharing modes:
- **Record zone sharing** — shares ALL records in a custom zone (unbounded)
- **Record hierarchy sharing** — shares a root record and its descendants (precise)

> **SQLiteData uses record hierarchy sharing** — `SyncEngine.share(record:)` shares a root record and its one-foreign-key descendants.

## Creating a Share

Two approaches — zone-wide or hierarchy-based:

| Approach | Use | CKShare Init |
|----------|-----|-------------|
| Zone sharing | All records in a zone | `CKShare(recordZoneID:)` |
| Hierarchy sharing | Root record + descendants | `CKShare(rootRecord:)` |

> **SQLiteData uses hierarchy sharing** via `SyncEngine.share(record:)`.

Save with `CKModifyRecordsOperation` — shared records must already exist in iCloud or be part of the same save.

For UICloudSharingController implementation code, delegate methods, and local caching patterns, see `/skill sqlitedata-swift-cloudkit-sharing`.

## Share Lifecycle

1. **Create** — `CKShare(rootRecord:)` or `CKShare(recordZoneID:)`
2. **Save** — `CKModifyRecordsOperation`
3. **Invite** — CloudKit assigns a stable share URL; distribute via `UICloudSharingController` (iOS) or `NSSharingService` (macOS)
4. **Accept** — Recipient taps URL → system launches app with `CKShare.Metadata` → confirm with `CKAcceptSharesOperation`
5. **Manage** — Owner can stop sharing (delete share); participant can leave (delete from shared DB); remove participant via `removeParticipant(_:)`

> **SQLiteData equivalents:** `syncEngine.share(record:)`, `syncEngine.acceptShare(metadata:)`, `syncEngine.unshare(record:)`

**Key Info.plist requirement:**
```xml
<key>CKSharingSupported</key>
<true/>
```
Required for the system to launch your app when a user taps a share URL.

## Permissions

| Permission | Meaning |
|-----------|---------|
| `.readOnly` | Participant can view but not modify |
| `.readWrite` | Participant can modify shared records |
| `.none` | Private share (invited only) |
| public share | Anyone with URL can join |

> **SQLiteData:** Write permission is enforced automatically. Catch `SyncEngine.writePermissionError` on `DatabaseError`.

## Custom Sharing Flow (without UICloudSharingController)

1. `CKFetchShareParticipantsOperation` → generate participants
2. `addParticipant(_:)` → add to share
3. Save share to iCloud
4. Distribute share URL
5. `CKFetchShareMetadataOperation` → fetch metadata from URL
6. `CKAcceptSharesOperation` → confirm participation

## Key CloudKit Types

| Type | Purpose |
|------|---------|
| `CKShare` | Manages a collection of shared records |
| `CKShare.Metadata` | Describes shared record metadata (provided on accept) |
| `CKShare.Participant` | Describes a user's participation |
| `UICloudSharingController` | Standard sharing UI (iOS) |
| `CKFetchShareMetadataOperation` | Fetch share metadata from URL |
| `CKAcceptSharesOperation` | Confirm participation |
| `CKFetchShareParticipantsOperation` | Convert identities to participants |
| `CKSyncEngine` | Manages local/remote record sync |

## Related Skills

- `/skill sqlitedata-swift-cloudkit` — SQLiteData sharing API (SyncEngine.share/unshare/acceptShare)
- `/skill sqlitedata-swift-cloudkit-sharing` — Apple sample code with UICloudSharingController
- `/skill sqlitedata-swift-ckrecord-id` — Record ID structure
- `/skill sqlitedata-swift-deploy-schema` — Deploy schema before shipping
