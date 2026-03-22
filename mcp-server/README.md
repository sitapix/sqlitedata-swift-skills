# SQLiteData Swift MCP Server

Model Context Protocol server for the SQLiteData skills collection.

Exposes SQLiteData skills as MCP resources, commands as prompts, and tools for ask-style routing, search, and skill reads.

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

- `ask` — route a question to the best skill
- `list_skills` — enumerate all skills
- `search_skills` — search by name/alias/description
- `get_skill` — retrieve a specific skill

## Resources

- `sqlitedata-swift://skills/{name}` — one resource per skill

## Prompts

- `ask` — with skill routing
- `audit` — with anti-pattern checklist
