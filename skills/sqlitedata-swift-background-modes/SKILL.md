---
name: sqlitedata-swift-background-modes
description: Use when enabling background modes for CloudKit sync or understanding UIBackgroundModes — covers Remote Notifications mode required for CloudKit sync, plus all other background execution modes in Xcode.
license: MIT
---

# Configuring Background Execution Modes

## Real questions this skill answers

- "What background mode do I need for CloudKit sync?"
- "How do I enable Remote Notifications in Xcode?"
- "What does each UIBackgroundModes value do?"

---

Apple's guide for declaring background execution modes in Xcode.

> **SQLiteData context:** For CloudKit sync, you must enable **Remote notifications** background mode. This is step 2 after enabling iCloud/CloudKit (`/skill sqlitedata-swift-icloud-services`).

## For CloudKit Sync: Enable Remote Notifications

**Steps:**
1. Select your project in Xcode's Project navigator
2. Select the app target
3. Click **Signing & Capabilities**
4. Add **Background Modes** capability (if not present)
5. Check **Remote notifications**

This allows CloudKit to silently notify your app of server-side changes, which `SyncEngine` uses to trigger incremental sync.

## How It Works

- Xcode adds `UIBackgroundModes` array to Info.plist
- Selected modes populate the array with string values
- The system uses these to determine what your app can do in the background

> Use sparingly — overuse impacts battery life and device performance.

## All Background Modes Reference

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
| Workout processing | `workout-processing` | watchOS |
| Nearby Interaction | `nearby-interaction` | iOS, iPadOS |
| Push to Talk | `push-to-talk` | iOS, iPadOS |

> **Not available for macOS.**

## Related Skills

- `/skill sqlitedata-swift-icloud-services` — Step 1: Enable iCloud + CloudKit capability
- `/skill sqlitedata-swift-deploy-schema` — Step 3: Deploy schema before shipping
- `/skill sqlitedata-swift-cloudkit` — SQLiteData SyncEngine setup
