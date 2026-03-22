import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const server = createServer();
const { pluginCatalog } = server;

// ── Basic catalog checks ────────────────────────────────────────────────

assert.ok(pluginCatalog.skills.length >= 12, `expected >=12 skills, got ${pluginCatalog.skills.length}`);
assert.ok(pluginCatalog.commands.length >= 2, `expected >=2 commands, got ${pluginCatalog.commands.length}`);

// ── Tool listing ────────────────────────────────────────────────────────

const toolsResp = server.handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} });
assert.equal(toolsResp.error, undefined, "tools/list should succeed");
const toolNames = toolsResp.result.tools.map((t) => t.name);
for (const expected of ["ask", "list_skills", "search_skills", "get_skill"]) {
  assert.ok(toolNames.includes(expected), `missing tool: ${expected}`);
}

// ── Resource listing ────────────────────────────────────────────────────

const resourcesResp = server.handleRequest({ jsonrpc: "2.0", id: 2, method: "resources/list" });
assert.equal(resourcesResp.error, undefined, "resources/list should succeed");
assert.ok(resourcesResp.result.resources.length >= 12, "expected >=12 skill resources");
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

// ── Routing accuracy ────────────────────────────────────────────────────

const routingTests = [
  ["How do I set up @FetchAll with @Table models?", "sqlitedata-swift-core", "core patterns"],
  ["My migration is failing with a constraint error", "sqlitedata-swift-diag", "troubleshooting"],
  ["How does SyncEngine work with CloudKit?", "sqlitedata-swift-cloudkit", "cloudkit sync"],
  ["What's the API signature for FetchKeyRequest?", "sqlitedata-swift-ref", "API reference"],
  ["How do I deploy schema to CloudKit production?", "sqlitedata-swift-deploy-schema", "schema deployment"],
  ["How do I set up iCloud capability in Xcode?", "sqlitedata-swift-icloud-services", "iCloud setup"],
  ["Comparing SwiftData sync to SQLiteData", "sqlitedata-swift-swiftdata-sync", "SwiftData comparison"],
];

let routePassed = 0;
let routeFailed = 0;
const routeFailures = [];

for (const [question, expectedSkill, label] of routingTests) {
  const resp = server.handleRequest({
    jsonrpc: "2.0", id: 200, method: "tools/call",
    params: { name: "ask", arguments: { question, includeSkillContent: false } },
  });
  const text = resp.result?.content?.[0]?.text || "";
  if (text.includes(`Recommended skill: ${expectedSkill}`)) {
    routePassed++;
  } else {
    routeFailed++;
    const match = text.match(/Recommended skill: ([\w-]+)/);
    routeFailures.push(`  ✗ ${label}: expected ${expectedSkill}, got ${match?.[1] ?? "unknown"}`);
  }
}

const threshold = Math.floor(routingTests.length * 0.75);
if (routePassed < threshold) {
  console.error(`Routing accuracy too low: ${routePassed}/${routingTests.length}\n${routeFailures.join("\n")}`);
  process.exit(1);
}

// ── Ask with content ────────────────────────────────────────────────────

const askResp = server.handleRequest({
  jsonrpc: "2.0", id: 300, method: "tools/call",
  params: { name: "ask", arguments: { question: "How do I use @FetchAll?", includeSkillContent: true } },
});
assert.equal(askResp.error, undefined, "ask with content should succeed");
assert.ok(askResp.result.content[0].text.length > 500, "ask should return substantial content");

process.stdout.write(
  `MCP smoke test passed (skills: ${pluginCatalog.skills.length}, routing: ${routePassed}/${routingTests.length}${routeFailures.length > 0 ? ", soft misses: " + routeFailures.join("; ") : ""})\n`,
);
