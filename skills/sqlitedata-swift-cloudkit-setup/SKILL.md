---
name: sqlitedata-swift-cloudkit-setup
description: Use when setting up or troubleshooting iCloud/CloudKit configuration for SQLiteData sync — covers enabling iCloud capability, CloudKit entitlements, container creation, Remote Notifications background mode, deploying schema from development to production, and resetting the development environment via CloudKit Console.
---

# CloudKit Setup for SQLiteData

Complete setup guide for CloudKit sync with SQLiteData — from Xcode capabilities through production deployment.

> **SQLiteData context:** These are the infrastructure steps needed before writing any SyncEngine code. After completing setup here, configure `SyncEngine` per `/skill sqlitedata-swift-cloudkit`.

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
