#!/usr/bin/env node

/**
 * Combines skill SKILL.md files into domain agent files.
 *
 * Run:           node scripts/build-agents.mjs
 * Check only:    node scripts/build-agents.mjs --check
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");
const AGENTS_DIR = join(ROOT, "agents");

// ── Domain agent definitions ────────────────────────────────────────────────

const agents = [
  {
    name: "sqlitedata-reference",
    description:
      "Look up SQLiteData API signatures, CloudKit SyncEngine setup, sharing, iCloud services, CKRecord.ID mapping, background modes, schema deployment, and SwiftData sync comparison.",
    skills: [
      "sqlitedata-swift-ref",
      "sqlitedata-swift-cloudkit",
      "sqlitedata-swift-cloudkit-sharing",
      "sqlitedata-swift-shared-records",
      "sqlitedata-swift-swiftdata-sync",
      "sqlitedata-swift-icloud-services",
      "sqlitedata-swift-ckrecord-id",
      "sqlitedata-swift-background-modes",
      "sqlitedata-swift-deploy-schema",
    ],
    preamble: `You answer specific questions about SQLiteData APIs, CloudKit sync, and related Apple services.

## Instructions

1. Read the user's question carefully.
2. Find the relevant section in the reference material below.
3. Return ONLY the information that answers their question — maximum 40 lines.
4. Include exact API signatures, code examples, and gotchas when relevant.
5. Do NOT dump all reference material — extract what is relevant.
6. Always warn about key gotchas: UUID primary keys required for sync, ON CONFLICT REPLACE needed, no UNIQUE constraints on synced tables, backwards-compatible migrations only.
7. If the question is about @Table models, @FetchAll, migrations, or query building, recommend the user consult the sqlitedata-swift-core skill.
8. If the question is about debugging errors, recommend the user consult the sqlitedata-swift-diag skill.`,
  },
];

// ── Skill-to-agent mapping ──────────────────────────────────────────────────

const skillToAgent = new Map();
for (const agent of agents) {
  for (const skill of agent.skills) {
    skillToAgent.set(skill, agent.name);
  }
}

const registeredSkills = new Set([
  "sqlitedata-swift",
  "sqlitedata-swift-core",
  "sqlitedata-swift-diag",
]);

// ── Helpers ─────────────────────────────────────────────────────────────────

function readSkillContent(skillName) {
  const path = join(SKILLS_DIR, skillName, "SKILL.md");
  if (!existsSync(path)) {
    console.error(`  ⚠ Skill not found: ${path}`);
    return null;
  }
  const raw = readFileSync(path, "utf-8");
  const match = raw.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return match ? match[1].trim() : raw.trim();
}

function rewriteCrossReferences(content, currentAgentName) {
  return content.replace(
    /`?\/skill (sqlitedata-swift[\w-]*)`?/g,
    (match, skillName) => {
      if (registeredSkills.has(skillName)) {
        return match;
      }
      const targetAgent = skillToAgent.get(skillName);
      if (!targetAgent) {
        return match;
      }
      const label = skillName
        .replace("sqlitedata-swift-", "")
        .replace(/-/g, " ");
      if (targetAgent === currentAgentName) {
        return `the ${label} section in this reference`;
      }
      return `the **${targetAgent}** agent`;
    },
  );
}

function buildAgent(agent) {
  const sections = [];
  for (const skillName of agent.skills) {
    const content = readSkillContent(skillName);
    if (!content) continue;
    sections.push(rewriteCrossReferences(content, agent.name));
  }

  const frontmatter = [
    "---",
    `name: ${agent.name}`,
    `description: ${agent.description}`,
    "model: sonnet",
    "tools:",
    "  - Glob",
    "  - Grep",
    "  - Read",
    "---",
  ].join("\n");

  const heading = `# ${agent.name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")} Agent`;

  return [
    frontmatter,
    "",
    heading,
    "",
    agent.preamble,
    "",
    "---",
    "",
    sections.join("\n\n---\n\n"),
    "",
  ].join("\n");
}

// ── Main ────────────────────────────────────────────────────────────────────

const checkMode = process.argv.includes("--check");

if (checkMode) {
  let stale = 0;
  for (const agent of agents) {
    const expected = buildAgent(agent);
    const outPath = join(AGENTS_DIR, `${agent.name}.md`);
    if (!existsSync(outPath)) {
      console.error(`Missing agent file: ${outPath}`);
      stale++;
      continue;
    }
    const actual = readFileSync(outPath, "utf-8");
    if (actual !== expected) {
      console.error(`Stale agent file: agents/${agent.name}.md`);
      stale++;
    }
  }
  if (stale > 0) {
    console.error(`\nERROR: ${stale} agent file(s) out of date. Run: node scripts/build-agents.mjs`);
    process.exit(1);
  }
  console.log("Agent files are up to date.");
  process.exit(0);
}

if (!existsSync(AGENTS_DIR)) {
  mkdirSync(AGENTS_DIR, { recursive: true });
}

console.log("Building domain agents from skills...\n");

for (const agent of agents) {
  const output = buildAgent(agent);
  const outPath = join(AGENTS_DIR, `${agent.name}.md`);
  writeFileSync(outPath, output, "utf-8");

  const lineCount = output.split("\n").length;
  console.log(`  ✓ ${agent.name}.md (${lineCount} lines, ${agent.skills.length} skills)`);
}

console.log("\nDone. Agent files written to agents/");
