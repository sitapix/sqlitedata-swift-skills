---
description: Natural-language entry point for SQLiteData. Use when the user has a SQLiteData question but does not know which skill to invoke.
argument-hint: [question]
---

# SQLiteData Ask

Use this command when the user has a SQLiteData problem but not a skill name.

## When to Use

Use this front door for broad SQLiteData questions, routing-heavy prompts, or requests that mention symptoms instead of APIs.

## Quick Decision

- Broad SQLiteData question -> `/skill sqlitedata-swift`
- CloudKit sync, sharing, SyncEngine -> `/skill sqlitedata-swift-cloudkit`
- @Table, @FetchAll, queries, migrations, setup -> `/skill sqlitedata-swift-core`
- API signatures, types, method reference -> `/skill sqlitedata-swift-ref`
- Errors, crashes, debugging -> `/skill sqlitedata-swift-diag`

## Core Guidance

Treat `$ARGUMENTS` as the user's SQLiteData problem statement.

Use this routing taxonomy:

- `router`: broad intake and redirection (`sqlitedata-swift`)
- `core`: models, queries, fetch wrappers, migrations, DI (`sqlitedata-swift-core`)
- `cloudkit`: sync, sharing, metadata, schema constraints (`sqlitedata-swift-cloudkit`)
- `ref`: API signatures, types, init parameters (`sqlitedata-swift-ref`)
- `diag`: errors, crashes, troubleshooting (`sqlitedata-swift-diag`)

Jump directly to specialist skills when the request is already narrow:

- `/skill sqlitedata-swift-core` for @Table models, @FetchAll/@FetchOne/@Fetch, FetchKeyRequest, database setup, migrations, query building
- `/skill sqlitedata-swift-cloudkit` for SyncEngine, CKSyncEngine, sharing, SyncMetadata, backwards-compatible migrations, account changes
- `/skill sqlitedata-swift-ref` for "what methods does X have?", init parameters, protocol conformances, type details
- `/skill sqlitedata-swift-diag` for migration failures, constraint violations, sync not working, query errors, permission issues

## Routing Rules

1. If the request mentions SyncEngine, CloudKit, sharing, sync, or iCloud, use `/skill sqlitedata-swift-cloudkit`.
2. If the request mentions @Table, @FetchAll, @FetchOne, @Fetch, migrations, queries, or database setup, use `/skill sqlitedata-swift-core`.
3. If the request asks about API signatures, types, or method details, use `/skill sqlitedata-swift-ref`.
4. If the request describes an error, crash, or something not working, use `/skill sqlitedata-swift-diag`.
5. If the request is broad or ambiguous but still obviously SQLiteData work, use `/skill sqlitedata-swift` (the router).
6. If the request is too ambiguous to route safely, ask exactly one concise clarification question.

## Response Style

- Do not explain the full skill taxonomy unless the user asks.
- Do not drift into SwiftData or Core Data advice when the problem is SQLiteData.
- Prefer acting over describing which route you might take.

## Cross-Domain Routing

When the question spans SQLiteData and another domain:

- SQLiteData + SwiftUI state -> `/skill sqlitedata-swift-core` for the data layer
- SQLiteData + concurrency -> `/skill sqlitedata-swift-core` for thread-safe patterns
- SQLiteData + migration from SwiftData -> `/skill sqlitedata-swift-core` for equivalent patterns, `/skill sqlitedata-swift-swiftdata-sync` for comparison
- Raw GRDB without SQLiteData -> out of scope for these skills

## Related Skills

- `/skill sqlitedata-swift` is the broad router when the right specialist is not obvious yet.
- `/skill sqlitedata-swift-core` covers the most common patterns — default when unclear.
- `/skill sqlitedata-swift-cloudkit` is for all CloudKit sync and sharing work.
- `/skill sqlitedata-swift-ref` is the API reference for type lookups.
- `/skill sqlitedata-swift-diag` is the symptom-first debugger.
