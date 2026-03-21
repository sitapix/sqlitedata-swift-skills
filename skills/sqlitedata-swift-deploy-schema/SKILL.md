---
name: sqlitedata-swift-deploy-schema
description: Use when preparing to ship a CloudKit app, resetting dev environment, or understanding the dev-to-production schema workflow — covers deploying an iCloud Container's schema to production via CloudKit Console.
license: MIT
---

# Deploying an iCloud Container's Schema

## Real questions this skill answers

- "How do I deploy my CloudKit schema to production?"
- "How do I reset the development environment?"
- "What happens if I add a field after deploying to production?"

---

Apple's guide for deploying CloudKit schemas from development to production.

> **SQLiteData context:** After designing your schema with `sqlitedata-swift-cloudkit` patterns (UUID primary keys, `ON CONFLICT REPLACE`, no UNIQUE constraints), you must deploy the schema to production before shipping. This skill covers Apple's side of that process.

## Overview

During development, you create your schema and add records for testing in the **development environment**. Apps in the App Store access only the **production environment**. Before publishing, deploy the development schema to production.

Key rules:
- Every deploy merges **additive changes** into production
- You **cannot delete** record types or fields already in production
- Apps in development can access either environment

## Reset the Development Environment

Resets all records in the development environment. If schema isn't in production, also deletes all record types. Otherwise, development schema reverts to production state.

**Steps:**
1. Sign in to [CloudKit Console](https://icloud.developer.apple.com/)
2. Select **CloudKit Database** app
3. Choose your app's container
4. Select **Reset Environment** (left sidebar)
5. Read the warning, check the box, click **Reset**

## Deploy the Development Schema

Copies record types, fields, and indexes to production — but **not records**. After deployment, populate production and test there.

> **Permissions:** You need admin privileges to edit the production environment. Individual developers are automatically admin. Team members should ask their team admin.

**Steps:**
1. Sign in to [CloudKit Console](https://icloud.developer.apple.com/)
2. Select **CloudKit Database** app
3. Choose your container
4. Select **Deploy Schema Changes** (left sidebar)
5. Review pending changes, click **Deploy**

## Related Skills

- `/skill sqlitedata-swift-cloudkit` — SQLiteData schema design rules for CloudKit compatibility
- `/skill sqlitedata-swift-icloud-services` — Setting up iCloud capability in Xcode
- `/skill sqlitedata-swift-shared-records` — CloudKit sharing API overview
