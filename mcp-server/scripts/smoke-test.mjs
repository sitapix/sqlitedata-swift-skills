import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const server = createServer();
const { pluginCatalog } = server;

// ── Basic catalog checks ────────────────────────────────────────────────

assert.ok(pluginCatalog.skills.length >= 8, `expected >=8 skills, got ${pluginCatalog.skills.length}`);
assert.ok(pluginCatalog.commands.length >= 2, `expected >=2 commands, got ${pluginCatalog.commands.length}`);
assert.ok(pluginCatalog.searchIndex, "expected search index to be built");

// ── Tool listing ────────────────────────────────────────────────────────

const toolsResp = server.handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
assert.equal(toolsResp.error, undefined, "tools/list should succeed");
const toolNames = toolsResp.result.tools.map((t) => t.name);
for (const expected of ["list_skills", "search_skills", "read_skill", "get_catalog"]) {
  assert.ok(toolNames.includes(expected), `missing tool: ${expected}`);
}

// ── Resource listing ────────────────────────────────────────────────────

const resourcesResp = server.handleRequest({ jsonrpc: "2.0", id: 2, method: "resources/list" });
assert.equal(resourcesResp.error, undefined, "resources/list should succeed");
assert.ok(resourcesResp.result.resources.length >= 8, "expected >=8 skill resources");
assert.ok(
  resourcesResp.result.resources.some((r) => r.uri.includes("sqlitedata-swift-core")),
  "expected core skill resource",
);

// ── Prompt listing ──────────────────────────────────────────────────────

const promptsResp = server.handleRequest({ jsonrpc: "2.0", id: 3, method: "prompts/list" });
assert.equal(promptsResp.error, undefined, "prompts/list should succeed");
assert.ok(
  promptsResp.result.prompts.some((p) => p.name === "ask"),
  "expected ask prompt",
);

// ── Skill content reads ─────────────────────────────────────────────────

const skillContentTests = [
  { name: "sqlitedata-swift", mustContain: "Router", minLength: 500 },
  { name: "sqlitedata-swift-core", mustContain: "@Table", minLength: 500 },
  { name: "sqlitedata-swift-cloudkit", mustContain: "SyncEngine", minLength: 500 },
  { name: "sqlitedata-swift-ref", mustContain: "FetchAll", minLength: 500 },
  { name: "sqlitedata-swift-diag", mustContain: "error", minLength: 200 },
];

for (const { name, mustContain, minLength } of skillContentTests) {
  const skill = pluginCatalog.skills.find((s) => s.name === name);
  assert.ok(skill, `skill ${name} should exist`);

  const readResp = server.handleRequest({
    jsonrpc: "2.0", id: 100, method: "resources/read",
    params: { uri: skill.uri },
  });
  assert.equal(readResp.error, undefined, `resources/read for ${name} should succeed`);
  const text = readResp.result.contents[0].text;
  assert.ok(text.length >= minLength, `${name} content too short (${text.length})`);
  assert.match(text, new RegExp(mustContain), `${name} missing "${mustContain}"`);
}

// ── Search ranking ──────────────────────────────────────────────────────

const searchTests = [
  ["@FetchAll @Table models", "sqlitedata-swift-core", "core patterns"],
  ["migration constraint error", "sqlitedata-swift-diag", "troubleshooting"],
  ["SyncEngine CloudKit", "sqlitedata-swift-cloudkit", "cloudkit sync"],
  ["FetchKeyRequest API signature", "sqlitedata-swift-ref", "API reference"],
  ["deploy schema CloudKit production", "sqlitedata-swift-cloudkit-setup", "schema deployment"],
  ["iCloud capability Xcode", "sqlitedata-swift-cloudkit-setup", "iCloud setup"],
  ["SwiftData sync comparison", "sqlitedata-swift-swiftdata-sync", "SwiftData comparison"],
];

let searchPassed = 0;
let searchFailed = 0;
const searchFailures = [];

for (const [query, expectedSkill, label] of searchTests) {
  const resp = server.handleRequest({
    jsonrpc: "2.0", id: 200, method: "tools/call",
    params: { name: "search_skills", arguments: { query, limit: 3 } },
  });
  const text = resp.result?.content?.[0]?.text || "";
  // Expected skill should appear in top 3 results
  if (text.includes(expectedSkill)) {
    searchPassed++;
  } else {
    searchFailed++;
    searchFailures.push(`  ✗ ${label}: "${expectedSkill}" not in top 3 for "${query}"`);
  }
}

const searchThreshold = Math.floor(searchTests.length * 0.75);
if (searchPassed < searchThreshold) {
  console.error(`Search ranking too low: ${searchPassed}/${searchTests.length}\n${searchFailures.join("\n")}`);
  process.exit(1);
}

// ── read_skill with section filtering ───────────────────────────────────

const listSectionsResp = server.handleRequest({
  jsonrpc: "2.0", id: 300, method: "tools/call",
  params: { name: "read_skill", arguments: { name: "sqlitedata-swift-core", listSections: true } },
});
assert.equal(listSectionsResp.error, undefined, "read_skill listSections should succeed");
const sectionsText = listSectionsResp.result.content[0].text;
assert.ok(sectionsText.includes("Section"), "listSections should include Section header");
assert.ok(sectionsText.includes("Chars"), "listSections should include Chars column");

const filteredResp = server.handleRequest({
  jsonrpc: "2.0", id: 301, method: "tools/call",
  params: { name: "read_skill", arguments: { name: "sqlitedata-swift-core", sections: ["Model Definition"] } },
});
assert.equal(filteredResp.error, undefined, "read_skill with sections filter should succeed");
const filteredText = filteredResp.result.content[0].text;
assert.ok(filteredText.includes("@Table"), "filtered content should include @Table");
assert.ok(filteredText.length < pluginCatalog.skills.find((s) => s.name === "sqlitedata-swift-core").markdown.length,
  "filtered content should be shorter than full skill");

// ── get_catalog ─────────────────────────────────────────────────────────

const catalogResp = server.handleRequest({
  jsonrpc: "2.0", id: 400, method: "tools/call",
  params: { name: "get_catalog", arguments: {} },
});
assert.equal(catalogResp.error, undefined, "get_catalog should succeed");
const catalogText = catalogResp.result.content[0].text;
assert.ok(catalogText.includes("Skills Catalog"), "catalog should have title");
assert.ok(catalogText.includes("sqlitedata-swift-core"), "catalog should list core skill");

// ── Summary ─────────────────────────────────────────────────────────────

process.stdout.write(
  `MCP smoke test passed (skills: ${pluginCatalog.skills.length}, search: ${searchPassed}/${searchTests.length}${searchFailures.length > 0 ? ", soft misses: " + searchFailures.join("; ") : ""})\n`,
);
