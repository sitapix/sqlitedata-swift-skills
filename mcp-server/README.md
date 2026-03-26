# SQLiteData Swift MCP Server

Model Context Protocol server for the SQLiteData skills collection.

Exposes SQLiteData skills as MCP resources, commands as prompts, and tools for search, section-filtered reads, and catalog browsing.

## Install

### Published package

```bash
npx -y sqlitedata-swift-mcp
```

### From the repo

```bash
node mcp-server/src/server.mjs
```

## Example MCP Config

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

### Local checkout

```json
{
  "mcpServers": {
    "sqlitedata-swift": {
      "command": "node",
      "args": ["/path/to/sqlite-data/mcp-server/src/server.mjs"]
    }
  }
}
```

## Tools

- `search_skills` — BM25 ranked search with matching sections
- `read_skill` — read skill content with optional section filtering
- `get_catalog` — browse skills organized by category
- `list_skills` — enumerate all skills

## Resources

- `sqlitedata-swift://skills/{name}` — one resource per skill

## Prompts

- `ask` — with skill routing
- `audit` — with anti-pattern checklist
