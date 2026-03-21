---
name: sqlitedata-swift-ckrecord-id
description: Use when understanding how SQLiteData maps UUID primary keys to CloudKit record IDs or debugging record name constraints — covers CKRecord.ID class, record name rules, zone IDs, and cross-zone lookups.
license: MIT
---

# CKRecord.ID

## Real questions this skill answers

- "How does SQLiteData map UUIDs to CKRecord.ID?"
- "What are the constraints on CloudKit record names?"
- "How do record zones relate to record IDs?"

---

Apple's reference for the object that uniquely identifies a CloudKit record.

> **SQLiteData context:** SQLiteData maps your `@Table` struct's UUID primary key to a `CKRecord.ID` record name. Understanding record ID constraints explains why SQLiteData requires UUID primary keys and ASCII-safe names for CloudKit sync.

## Overview

`CKRecord.ID` = **record name** (String) + **zone ID** (`CKRecordZone.ID`)

```swift
class CKRecord.ID: NSObject, NSCopying, NSSecureCoding, Sendable
```

**Availability:** iOS 8.0+, macOS 10.10+, tvOS, visionOS 1.0+, watchOS 3.0+

## Record Name Constraints

- ASCII string, max **255 characters**
- If not specified, CloudKit derives it from a UUID (guaranteed unique)
- Custom names must be unique **within the zone**
- Record IDs are unique **per database** (but can be reused across different users' private databases)

> **SQLiteData mapping:** Your `@Table` struct's `id: UUID` becomes the `recordName`. This is why SQLiteData requires UUID primary keys — they satisfy CloudKit's uniqueness requirement across devices.

## Initializers

```swift
// Record in default zone
convenience init(recordName: String)

// Record in specific zone
convenience init(recordName: String, zoneID: CKRecordZone.ID)
```

## Properties

```swift
var recordName: String    // The unique name
var zoneID: CKRecordZone.ID  // The zone containing the record
```

## Special Constant

```swift
let CKRecordNameZoneWideShare: String
// Name of the share record that manages a shared record zone
```

## Cross-Zone References

`CKRecord.Reference` only works within a single zone. To reference records across zones or databases:
1. Save the `recordName` and zone ID strings
2. Recreate `CKRecord.ID` and `CKRecordZone.ID` when needed
3. Fetch the record using the reconstructed IDs

## Related Metadata on CKRecord

| Property | Type | Description |
|----------|------|-------------|
| `recordID` | `CKRecord.ID` | Unique ID |
| `recordType` | `String` | App-defined type name |
| `creationDate` | `Date?` | First saved to server |
| `creatorUserRecordID` | `CKRecord.ID?` | Creator's user record |
| `modificationDate` | `Date?` | Last saved to server |
| `lastModifiedUserRecordID` | `CKRecord.ID?` | Last modifier's user record |
| `recordChangeTag` | `String?` | Server change token |

> **SQLiteData mapping:** These metadata fields are available via `SyncMetadata.lastKnownServerRecord` when you attach the metadatabase. See `/skill sqlitedata-swift-cloudkit` section on SyncMetadata.

## Related Skills

- `/skill sqlitedata-swift-cloudkit` — How SQLiteData maps table primary keys to CKRecord.IDs
- `/skill sqlitedata-swift-shared-records` — Sharing records (uses CKRecord.ID for share management)
- `/skill sqlitedata-swift-cloudkit-sharing` — Sample code for sharing implementation
