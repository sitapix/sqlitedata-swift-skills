---
name: sqlitedata-swift-icloud-services
description: Use when setting up iCloud capability for CloudKit sync or configuring iCloud services in Xcode — covers CloudKit, Key-value storage, iCloud Documents, capability setup, entitlements, container creation, and CloudKit Console access.
license: MIT
---

# Configuring iCloud Services

## Real questions this skill answers

- "How do I add the iCloud capability in Xcode?"
- "How do I create a new iCloud container?"
- "What entitlements does CloudKit need?"
- "How do I access the CloudKit Console?"

---

Apple's guide for enabling iCloud capabilities in Xcode.

> **SQLiteData context:** This is step 1 of CloudKit setup for SQLiteData apps. After enabling iCloud + CloudKit here, you'll also need Background Modes (`/skill sqlitedata-swift-background-modes`), then configure `SyncEngine` per `/skill sqlitedata-swift-cloudkit`.

## iCloud Services Overview

| Service | Use Case | Storage |
|---------|----------|---------|
| **Key-value storage** | Small data (preferences), up to 1 MB / 1024 pairs | `NSUbiquitousKeyValueStore` |
| **iCloud Documents** | File-based sync via `UIDocument`/`NSDocument` | Ubiquity container (on-disk) |
| **CloudKit** | Structured data with full schema control + sharing | `CKContainer` databases |

**For SQLiteData apps, enable CloudKit.**

## Adding the iCloud Capability

1. Add capability: follow Apple's "Adding capabilities to your app" guide
2. Select **iCloud** from Xcode's Capabilities library
3. Xcode updates entitlements with `iCloud Container Identifiers Entitlement`
4. If using automatic signing, Xcode also enables iCloud on your App ID

> Removing the iCloud capability in Xcode does **not** auto-disable it in your developer account — you must do that manually.

## Enabling CloudKit

In the **Services** section of the iCloud capability, check **CloudKit**.

Xcode adds these entitlements:

| Service | Entitlement |
|---------|-------------|
| Key-value storage | `com.apple.developer.ubiquity-kvstore-identifier` |
| iCloud Documents | `com.apple.developer.icloud-services` + `com.apple.developer.ubiquity-container-identifiers` |
| CloudKit | `com.apple.developer.icloud-services` |

> Enabling CloudKit also auto-adds the **Push Notifications** capability (CloudKit uses push to notify of server changes).

## Managing Containers

After adding iCloud capability, Xcode fetches existing containers from your developer account.

**To create a new container:**
1. Click **Add** (+) below the containers list
2. Enter name: must start with `iCloud.` and use reverse DNS (e.g., `iCloud.com.example.myapp`)
3. Click **OK**

Xcode registers it in your account, adds it to entitlements, and selects it.

**Using the container in code (CloudKit):**
```swift
let container = CKContainer(identifier: "iCloud.com.example.myapp")
```

**For SQLiteData**, pass it to SyncEngine:
```swift
$0.defaultSyncEngine = try SyncEngine(
    for: $0.defaultDatabase,
    tables: ...,
    containerIdentifier: "iCloud.com.example.myapp"  // nil = auto from entitlements
)
```

## CloudKit Console Access

- Click **CloudKit Console** button in Xcode's iCloud capability section
- Or go directly to [icloud.developer.apple.com](https://icloud.developer.apple.com/)
- Sign in with the same Apple Account as your developer account
- Use to manage schemas, inspect data, view operation logs, and performance telemetry

## Related Skills

- `/skill sqlitedata-swift-background-modes` — Step 2: Enable Remote Notifications background mode
- `/skill sqlitedata-swift-deploy-schema` — Deploy schema from dev to production
- `/skill sqlitedata-swift-cloudkit` — SQLiteData SyncEngine setup (uses the container configured here)
