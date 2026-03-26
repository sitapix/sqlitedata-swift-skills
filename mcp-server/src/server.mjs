#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  findSkill,
  getCatalog,
  getPrompt,
  getSkillSections,
  listSkills,
  loadPluginCatalog,
  searchSkills,
} from "./plugin-catalog.mjs";

const SERVER_INFO = {
  name: "sqlitedata-swift-mcp",
  version: "1.2.0",
};

const LATEST_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
  "2024-10-07",
];

function jsonResponse(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function makeTextResult(text) {
  return { content: [{ type: "text", text }] };
}

function formatSkill(skill) {
  return [
    `- Name: ${skill.name}`,
    `- Title: ${skill.title}`,
    `- Kind: ${skill.kind ?? "workflow"}`,
    `- Category: ${skill.category ?? "uncategorized"}`,
    `- Resource URI: ${skill.uri}`,
    "",
    "---",
    "",
    skill.markdown.trim(),
    "",
  ].join("\n");
}

function toolDefinitions() {
  return [
    {
      name: "list_skills",
      description: "List the SQLiteData skills exposed by this MCP server.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "search_skills",
      description: "Search SQLiteData skills by keyword query. Returns ranked results with matching section names. Use to find relevant skills for a topic like \"@FetchAll\", \"CloudKit sync\", or \"migration error\".",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query (e.g. \"CloudKit sync setup\", \"@FetchAll not updating\")." },
          limit: { type: "integer", minimum: 1, maximum: 20, description: "Max results (default 10)." },
          category: { type: "string", description: "Filter by category (e.g. \"sync\", \"patterns\")." },
          kind: { type: "string", description: "Filter by kind (e.g. \"ref\", \"diag\", \"router\")." },
        },
        required: ["query"],
      },
    },
    {
      name: "read_skill",
      description: "Read skill content with optional section filtering. Supports reading specific sections to reduce token usage. Use listSections to see available sections first.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Skill name (e.g. \"sqlitedata-swift-core\")." },
          uri: { type: "string", description: "Skill resource URI (alternative to name)." },
          sections: {
            type: "array",
            items: { type: "string" },
            description: "Section headings to include (case-insensitive substring match). Omit for full content.",
          },
          listSections: {
            type: "boolean",
            description: "If true, return only the section table of contents (heading + size) without content.",
          },
        },
      },
    },
    {
      name: "get_catalog",
      description: "Get the SQLiteData skills catalog organized by category. Returns skill names, kinds, and descriptions grouped by category.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter to a specific category (e.g. \"sync\", \"patterns\"). Omit for all categories.",
          },
          includeDescriptions: {
            type: "boolean",
            description: "Include skill descriptions in output. Default false for compact listing.",
          },
        },
      },
    },
  ];
}

export function createServer() {
  const pluginCatalog = loadPluginCatalog();

  function handleRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case "initialize": {
        const clientVersion = params?.protocolVersion ?? "2024-11-05";
        const negotiated = SUPPORTED_PROTOCOL_VERSIONS.includes(clientVersion)
          ? clientVersion
          : LATEST_PROTOCOL_VERSION;
        return jsonResponse(id, {
          protocolVersion: negotiated,
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: SERVER_INFO,
        });
      }

      case "notifications/initialized":
      case "notifications/cancelled":
        return null;

      case "tools/list":
        return jsonResponse(id, { tools: toolDefinitions() });

      case "tools/call": {
        const toolName = params?.name;
        const args = params?.arguments ?? {};

        switch (toolName) {
          case "list_skills":
            return jsonResponse(id, makeTextResult(JSON.stringify(listSkills(pluginCatalog), null, 2)));

          case "search_skills": {
            if (!args.query) return jsonError(id, -32602, "Required parameter: query");
            const results = searchSkills(pluginCatalog, args.query, {
              limit: args.limit,
              category: args.category,
              kind: args.kind,
            });
            if (results.length === 0) {
              return jsonResponse(id, makeTextResult(`No skills found for: "${args.query}"`));
            }
            const lines = [`# Search: "${args.query}"`, `${results.length} results`, ""];
            for (const r of results) {
              const kindTag = r.kind ? ` [${r.kind}]` : "";
              lines.push(`### ${r.name}${kindTag} (score: ${r.score})`);
              lines.push(r.description);
              if (r.matchingSections.length > 0) {
                lines.push(`Sections: ${r.matchingSections.join(", ")}`);
              }
              lines.push("");
            }
            return jsonResponse(id, makeTextResult(lines.join("\n")));
          }

          case "read_skill": {
            const skill = findSkill(pluginCatalog, { name: args.name, uri: args.uri });
            if (!skill) return jsonError(id, -32602, `Skill not found: ${args.name ?? args.uri}`);

            if (args.listSections) {
              const lines = [`## ${skill.name} — Sections`, `Total: ${skill.markdown.length} chars`, ""];
              lines.push("| Section | Chars |");
              lines.push("|---------|-------|");
              for (const s of skill.sections) {
                lines.push(`| ${s.heading} | ${s.charCount} |`);
              }
              return jsonResponse(id, makeTextResult(lines.join("\n")));
            }

            if (args.sections && args.sections.length > 0) {
              const result = getSkillSections(pluginCatalog, skill.name, args.sections);
              if (!result || !result.content) {
                return jsonResponse(id, makeTextResult(`No matching sections found in ${skill.name}.`));
              }
              const header = `## ${skill.name} (filtered: ${result.sections.map((s) => s.heading).join(", ")})\n\n`;
              return jsonResponse(id, makeTextResult(header + result.content));
            }

            return jsonResponse(id, makeTextResult(formatSkill(skill)));
          }

          case "get_catalog": {
            const catalog = getCatalog(pluginCatalog, args.category);
            const includeDescriptions = args.includeDescriptions === true;
            const lines = [`# SQLiteData Skills Catalog`, `${catalog.totalSkills} skills`, ""];

            const sorted = Object.entries(catalog.categories).sort(([a], [b]) => a.localeCompare(b));
            for (const [, cat] of sorted) {
              lines.push(`## ${cat.label} (${cat.skills.length})`);
              for (const s of cat.skills) {
                const kindTag = s.kind && s.kind !== "ref" ? ` [${s.kind}]` : "";
                if (includeDescriptions) {
                  lines.push(`- **${s.name}**${kindTag}: ${s.description}`);
                } else {
                  lines.push(`- ${s.name}${kindTag}`);
                }
              }
              lines.push("");
            }

            return jsonResponse(id, makeTextResult(lines.join("\n")));
          }

          default:
            return jsonError(id, -32601, `Unknown tool: ${toolName}`);
        }
      }

      case "resources/list": {
        const resources = pluginCatalog.skills.map((s) => ({
          uri: s.uri,
          name: s.name,
          description: s.description,
          mimeType: "text/markdown",
        }));
        return jsonResponse(id, { resources });
      }

      case "resources/read": {
        const uri = params?.uri;
        const skill = findSkill(pluginCatalog, { uri });
        if (!skill) return jsonError(id, -32602, `Resource not found: ${uri}`);
        return jsonResponse(id, {
          contents: [{ uri: skill.uri, mimeType: "text/markdown", text: skill.markdown }],
        });
      }

      case "resources/templates/list":
        return jsonResponse(id, { resourceTemplates: [] });

      case "prompts/list": {
        const prompts = pluginCatalog.commands.map((c) => ({
          name: c.name,
          description: c.description,
          arguments: c.name === "ask"
            ? [{ name: "question", description: "SQLiteData question", required: true }]
            : [{ name: "area", description: "Optional focus area", required: false }],
        }));
        return jsonResponse(id, { prompts });
      }

      case "prompts/get": {
        const prompt = getPrompt(pluginCatalog, params?.name, params?.arguments ?? {});
        if (!prompt) return jsonError(id, -32602, `Prompt not found: ${params?.name}`);
        return jsonResponse(id, prompt);
      }

      default:
        return jsonError(id, -32601, `Method not found: ${method}`);
    }
  }

  return { handleRequest, pluginCatalog };
}

// ── stdio transport ─────────────────────────────────────────────────────────

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const server = createServer();
  let framing = null; // auto-detect
  let buffer = "";

  function writeMessage(message) {
    const payload = JSON.stringify(message);
    if (framing === "raw-json") {
      process.stdout.write(`${payload}\n`);
    } else {
      process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n${payload}`);
    }
  }

  function processMessage(text) {
    let request;
    try {
      request = JSON.parse(text);
    } catch {
      writeMessage(jsonError(null, -32700, "Parse error"));
      return;
    }
    const response = server.handleRequest(request);
    if (response) writeMessage(response);
  }

  function findHeaderBoundary(buf) {
    const crlf = buf.indexOf("\r\n\r\n");
    if (crlf !== -1) return { headerEnd: crlf, separatorLength: 4 };
    const lf = buf.indexOf("\n\n");
    if (lf !== -1) return { headerEnd: lf, separatorLength: 2 };
    return null;
  }

  function drain() {
    while (buffer.length > 0) {
      if (framing === null) {
        if (buffer.startsWith("{")) {
          framing = "raw-json";
        } else if (buffer.startsWith("Content-Length:") || buffer.startsWith("content-length:")) {
          framing = "content-length";
        } else if (buffer.length < 16) {
          return;
        } else {
          framing = "content-length";
        }
      }

      if (framing === "raw-json") {
        const newline = buffer.indexOf("\n");
        if (newline === -1) {
          if (buffer.endsWith("}")) {
            const text = buffer;
            buffer = "";
            processMessage(text);
            continue;
          }
          return;
        }
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) processMessage(line);
        continue;
      }

      // content-length framing
      const boundary = findHeaderBoundary(buffer);
      if (!boundary) return;

      const header = buffer.slice(0, boundary.headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) {
        buffer = buffer.slice(boundary.headerEnd + boundary.separatorLength);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const bodyStart = boundary.headerEnd + boundary.separatorLength;
      if (buffer.length < bodyStart + contentLength) return;

      const body = buffer.slice(bodyStart, bodyStart + contentLength);
      buffer = buffer.slice(bodyStart + contentLength);
      processMessage(body);
    }
  }

  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    drain();
  });
}
