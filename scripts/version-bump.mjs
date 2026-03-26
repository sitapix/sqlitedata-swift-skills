#!/usr/bin/env node

/**
 * Bump the version across all project files, commit, and tag.
 *
 * Usage:
 *   node scripts/version-bump.mjs <major|minor|patch>
 *   node scripts/version-bump.mjs 1.7.0          # explicit version
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Files that contain the version ──────────────────────────────────────────

const VERSION_FILES = [
  { path: "claude-code.json", key: "version" },
  { path: ".claude-plugin/plugin.json", key: "version" },
  { path: ".claude-plugin/marketplace.json", key: "metadata.version" },
  { path: ".claude-plugin/marketplace.json", key: "plugins[0].version" },
  { path: "mcp-server/package.json", key: "version" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function readJSON(relPath) {
  return JSON.parse(readFileSync(join(ROOT, relPath), "utf-8"));
}

function writeJSON(relPath, data) {
  writeFileSync(join(ROOT, relPath), JSON.stringify(data, null, 2) + "\n");
}

function getCurrentVersion() {
  return readJSON("claude-code.json").version;
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (type) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      if (/^\d+\.\d+\.\d+$/.test(type)) return type;
      console.error(`Invalid bump type: ${type}`);
      console.error("Usage: node scripts/version-bump.mjs <major|minor|patch|x.y.z>");
      process.exit(1);
  }
}

function setNested(obj, keyPath, value) {
  const arrayMatch = keyPath.match(/^(.+)\[(\d+)\]\.(.+)$/);
  if (arrayMatch) {
    const [, arrKey, index, prop] = arrayMatch;
    obj[arrKey][Number(index)][prop] = value;
    return;
  }
  const parts = keyPath.split(".");
  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]];
  }
  target[parts[parts.length - 1]] = value;
}

function run(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
}

// ── Main ────────────────────────────────────────────────────────────────────

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node scripts/version-bump.mjs <major|minor|patch|x.y.z>");
  process.exit(1);
}

const current = getCurrentVersion();
const next = bumpVersion(current, arg);

console.log(`\nVersion bump: ${current} → ${next}\n`);

// Update each file
const updatedFiles = new Set();
for (const { path: relPath, key } of VERSION_FILES) {
  const data = readJSON(relPath);
  setNested(data, key, next);
  writeJSON(relPath, data);
  updatedFiles.add(relPath);
  console.log(`  ✓ ${relPath} (${key})`);
}

// Update package-lock.json if it exists and is tracked
try {
  const lockPath = "mcp-server/package-lock.json";
  const ignored = run(`git check-ignore ${lockPath} || true`);
  if (!ignored) {
    const lock = readJSON(lockPath);
    if (lock.version) lock.version = next;
    if (lock.packages?.[""]?.version) lock.packages[""].version = next;
    writeJSON(lockPath, lock);
    updatedFiles.add(lockPath);
    console.log(`  ✓ ${lockPath}`);
  } else {
    console.log(`  ⊘ ${lockPath} (gitignored, skipped)`);
  }
} catch {
  // no lock file, skip
}

// Git commit and tag
console.log(`\nCommitting and tagging...`);
const files = [...updatedFiles].map((f) => `"${f}"`).join(" ");
run(`git add ${files}`);
run(`git commit -m "version ${next}"`);
run(`git tag ${next}`);

console.log(`\n  ✓ Committed: version ${next}`);
console.log(`  ✓ Tagged:    ${next}`);
console.log(`\nDone. Run 'git push && git push --tags' to publish.\n`);
