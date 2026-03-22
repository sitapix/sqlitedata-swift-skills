---
description: Natural-language entry point for SQLiteData. Use when the user has a SQLiteData question but does not know which skill to invoke.
argument-hint: [question]
---

# SQLiteData Ask

Use this command when the user has a SQLiteData problem but not a skill name.

## Quick Decision

- Broad SQLiteData question -> `/skill sqlitedata-swift`
- @Table, @FetchAll, queries, migrations, setup -> `/skill sqlitedata-swift-core`
- Errors, crashes, debugging -> `/skill sqlitedata-swift-diag`
- CloudKit sync, sharing, API reference, iCloud setup -> launch **sqlitedata-reference** agent

## Core Guidance

Treat `$ARGUMENTS` as the user's SQLiteData problem statement.

### Routing rules

1. If the request mentions @Table, @FetchAll, @FetchOne, @Fetch, migrations, queries, or database setup, use `/skill sqlitedata-swift-core`.
2. If the request describes an error, crash, or something not working, use `/skill sqlitedata-swift-diag`.
3. If the request needs CloudKit sync, API signatures, sharing, iCloud setup, or reference content, launch the **sqlitedata-reference** agent.
4. If the request is broad or ambiguous but obviously SQLiteData work, use `/skill sqlitedata-swift`.
5. If the request is too ambiguous to route safely, ask exactly one concise clarification question.

### How to launch the domain agent

Use the Agent tool with `subagent_type` set to `sqlitedata-swift:sqlitedata-reference`. Pass the user's question as the prompt. The agent runs in isolated context and returns a focused answer.

### Why agents for reference

Domain agents run in isolated context. They have the full reference material, answer the specific question, and return a focused response. This keeps the main conversation clean.

## Response Style

- Do not explain the full skill taxonomy unless the user asks.
- Do not drift into SwiftData or Core Data advice when the problem is SQLiteData.
- Prefer acting over describing which route you might take.
