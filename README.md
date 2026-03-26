# SQLiteData

Deep SQLiteData expertise for AI coding assistants. Covers @Table models, @FetchAll/@FetchOne/@Fetch wrappers, database setup, migrations, CloudKit sync via SyncEngine, and troubleshooting.

## What is SQLiteData?

SQLiteData gives AI coding assistants focused guidance on [Point-Free's SQLiteData](https://github.com/pointfreeco/sqlite-data) — a fast, lightweight SwiftData replacement powered by SQLite (GRDB) with CloudKit sync support.

- **8 focused skills** covering core patterns, CloudKit sync, API reference, diagnostics, and Apple CloudKit docs
- **1 agent** for isolated reference lookups
- **2 commands** for plain-language questions and codebase auditing

> **Status:** SQLiteData is in active development. Some routes or docs may be incomplete. If you hit a bug or something looks off, please [open an issue](https://github.com/sitapix/sqlitedata-swift-skills/issues).

## Quick Start

### Claude Code (native plugin)

```bash
# Add marketplace
/plugin marketplace add sitapix/sqlitedata-swift-skills

# Install plugin
/plugin install sqlitedata-swift@sqlitedata-swift-marketplace
```

### MCP (VS Code, Cursor, Gemini CLI, and more)

Add to your MCP config:

```json
{
  "mcpServers": {
    "sqlitedata-swift": {
      "command": "npx",
      "args": ["-y", "sqlitedata-swift-mcp"]
    }
  }
}
```

Client-specific paths are in [mcp-server/README.md](mcp-server/README.md).

## Getting Started

Skills activate automatically based on your questions. Just ask:

```
"How do I set up a SQLiteData database?"
"My @FetchAll isn't updating the view"
"How do I sync with CloudKit using SyncEngine?"
"What's the difference between @FetchAll and @FetchOne?"
"My migration is failing with a constraint error"
"How do I share records with other iCloud users?"
```

You can also use commands directly:

```
/sqlitedata-swift:ask your question here
/sqlitedata-swift:audit                    # scan code for anti-patterns
/skill sqlitedata-swift-core               # @Table, @FetchAll, migrations
/skill sqlitedata-swift-diag               # debug errors and sync issues
```

## How It Works

8 skills organized into 3 inline entry points and 1 domain agent. Entry-point skills load inline for routing and quick answers. The domain agent bundles the other 5 skills for isolated-context reference lookups — only the focused answer comes back.

## About SQLiteData

[SQLiteData](https://github.com/pointfreeco/sqlite-data) is by [Point-Free](https://www.pointfree.co). It uses `@Table` structs instead of `@Model` classes, provides `@FetchAll`/`@FetchOne`/`@Fetch` property wrappers for reactive observation, and supports CloudKit synchronization and sharing — all built on [GRDB](https://github.com/groue/GRDB.swift).

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

MIT — See [LICENSE](LICENSE).
