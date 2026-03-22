import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_SKILLS_ROOT = path.resolve(__dirname, "../../skills");
export const DEFAULT_COMMANDS_ROOT = path.resolve(__dirname, "../../commands");

function toPosixPath(value) {
  return value.split(path.sep).join("/");
}

function loadFrontmatter(markdown) {
  const match = markdown.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { attributes: {}, body: markdown };

  const attributes = {};
  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes(":")) continue;
    const sep = line.indexOf(":");
    const key = line.slice(0, sep).trim();
    let value = line.slice(sep + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    attributes[key] = value;
  }

  return { attributes, body: markdown.slice(match[0].length) };
}

function extractTitle(markdown, fallback) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.replaceAll("`", "").trim() || fallback;
}

function wordTokens(query) {
  return String(query ?? "").toLowerCase().split(/[^a-z0-9_]+/i).filter(Boolean);
}

function makeSnippet(markdown, query) {
  const singleLine = markdown.replace(/\s+/g, " ").trim();
  if (!singleLine) return "";
  const lower = singleLine.toLowerCase();
  const normalized = String(query ?? "").trim().toLowerCase();
  const hit = normalized ? lower.indexOf(normalized) : -1;
  const start = hit >= 0 ? Math.max(0, hit - 80) : 0;
  const snippet = singleLine.slice(start, start + 220).trim();
  return start > 0 ? `...${snippet}` : snippet;
}

function scoreSkill(skill, query, tokens) {
  const lowerQuery = query.toLowerCase();
  const haystacks = [
    skill.name.toLowerCase(),
    skill.title.toLowerCase(),
    skill.description.toLowerCase(),
    skill.markdown.toLowerCase(),
    ...skill.aliases.map((a) => a.toLowerCase()),
  ];

  let score = 0;
  for (const haystack of haystacks) {
    if (haystack.includes(lowerQuery)) {
      score += haystack === skill.markdown.toLowerCase() ? 20 : 80;
    }
  }
  for (const token of tokens) {
    for (const haystack of haystacks) {
      if (haystack.includes(token)) {
        score += haystack === skill.markdown.toLowerCase() ? 2 : 12;
      }
    }
  }
  return score;
}

function routePatterns() {
  // Order matters: more specific patterns first, broad patterns last
  return [
    {
      name: "sqlitedata-swift-diag",
      reason: "matched error or troubleshooting terms",
      patterns: [
        /\b(error|debug|debugging|troubleshoot|fail|fails|failing|crash|constraint|permission|not working)\b/i,
        /\bwhy does\b/i,
      ],
    },
    {
      name: "sqlitedata-swift-swiftdata-sync",
      reason: "matched SwiftData comparison terms",
      patterns: [/\b(SwiftData sync|SwiftData.*compar|NSPersistentCloudKitContainer|ModelConfiguration)\b/i],
    },
    {
      name: "sqlitedata-swift-icloud-services",
      reason: "matched iCloud setup terms",
      patterns: [/\b(iCloud capability|entitlement|iCloud container|Xcode iCloud|iCloud.*setup|iCloud.*capability)\b/i],
    },
    {
      name: "sqlitedata-swift-deploy-schema",
      reason: "matched schema deployment terms",
      patterns: [/\b(deploy schema|cloudkit console|production schema|reset development|schema.*production)\b/i],
    },
    {
      name: "sqlitedata-swift-shared-records",
      reason: "matched sharing terms",
      patterns: [/\b(CKShare|shared records|sharing permissions|participants|UICloudSharingController)\b/i],
    },
    {
      name: "sqlitedata-swift-ref",
      reason: "matched API reference terms",
      patterns: [
        /\b(api signature|type signature|method signature|init parameter)\b/i,
        /\bwhat methods\b/i,
        /\b(FetchKeyRequest|DefaultDatabase|SyncMetadata)\b.*\b(signature|type|init|api)\b/i,
      ],
    },
    {
      name: "sqlitedata-swift-cloudkit",
      reason: "matched CloudKit or sync terms",
      patterns: [
        /\b(SyncEngine|CloudKit sync|CKRecord|SyncMetadata)\b/i,
        /\bcloudkit\b/i,
      ],
    },
    {
      name: "sqlitedata-swift-core",
      reason: "matched core pattern terms",
      patterns: [
        /\b(@Table|@FetchAll|@FetchOne|@Fetch|FetchKeyRequest|@Selection|@Column|DatabaseMigrator|prepareDependencies|defaultDatabase)\b/i,
        /\b(migration|insert|update|delete|join|leftJoin|@Observable|@ObservationIgnored)\b/i,
      ],
    },
  ];
}

export function loadPluginCatalog(skillsRoot = DEFAULT_SKILLS_ROOT, commandsRoot = DEFAULT_COMMANDS_ROOT) {
  const skillMetadataPath = path.join(skillsRoot, "catalog.json");
  const skillMetadata = existsSync(skillMetadataPath)
    ? JSON.parse(readFileSync(skillMetadataPath, "utf8")).skills ?? []
    : [];
  const metadataByName = new Map(skillMetadata.filter((e) => e?.name).map((e) => [e.name, e]));

  const skills = [];
  for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsRoot, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    const markdown = readFileSync(skillPath, "utf8");
    const { attributes, body } = loadFrontmatter(markdown);
    const metadata = metadataByName.get(entry.name) ?? {};
    const name = attributes.name || entry.name;

    skills.push({
      name,
      title: extractTitle(body, entry.name),
      description: attributes.description || metadata.description || "",
      category: metadata.category || null,
      kind: metadata.kind || null,
      entrypointPriority: metadata.entrypoint_priority ?? Number.MAX_SAFE_INTEGER,
      aliases: Array.isArray(metadata.aliases) ? metadata.aliases : [],
      relatedSkills: Array.isArray(metadata.related_skills) ? metadata.related_skills : [],
      uri: `sqlitedata-swift://skills/${encodeURIComponent(name)}`,
      relativePath: toPosixPath(path.relative(skillsRoot, skillPath)),
      markdown,
    });
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));

  const commands = [];
  if (existsSync(commandsRoot)) {
    for (const entry of readdirSync(commandsRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const commandPath = path.join(commandsRoot, entry.name);
      const markdown = readFileSync(commandPath, "utf8");
      const { attributes, body } = loadFrontmatter(markdown);
      const name = path.basename(entry.name, ".md");

      commands.push({
        name,
        title: extractTitle(body, name),
        description: attributes.description || "",
        argumentHint: attributes["argument-hint"] || "",
        markdown,
        uri: `sqlitedata-swift://commands/${encodeURIComponent(name)}`,
        relativePath: toPosixPath(path.relative(commandsRoot, commandPath)),
      });
    }
  }
  commands.sort((a, b) => a.name.localeCompare(b.name));

  return {
    skills,
    commands,
    skillByName: new Map(skills.map((s) => [s.name.toLowerCase(), s])),
    skillByUri: new Map(skills.map((s) => [s.uri, s])),
    commandByName: new Map(commands.map((c) => [c.name.toLowerCase(), c])),
  };
}

export function listSkills(catalog) {
  return catalog.skills.map((s) => ({
    name: s.name, title: s.title, description: s.description,
    category: s.category, kind: s.kind, uri: s.uri, relatedSkills: s.relatedSkills,
  }));
}

export function findSkill(catalog, locator = {}) {
  if (locator.uri) return catalog.skillByUri.get(String(locator.uri)) ?? null;
  if (locator.name) return catalog.skillByName.get(String(locator.name).toLowerCase()) ?? null;
  return null;
}

export function searchSkills(catalog, query, limit = 5) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return [];
  const tokens = wordTokens(trimmed);
  return catalog.skills
    .map((s) => ({ skill: s, score: scoreSkill(s, trimmed, tokens) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map(({ skill, score }) => ({
      name: skill.name, title: skill.title, description: skill.description,
      category: skill.category, kind: skill.kind, uri: skill.uri, score,
      snippet: makeSnippet(skill.markdown, trimmed),
    }));
}

export function routeAsk(catalog, question) {
  const normalized = String(question ?? "").trim();
  if (!normalized) return null;

  for (const route of routePatterns()) {
    if (route.patterns.some((p) => p.test(normalized))) {
      const skill = findSkill(catalog, { name: route.name });
      if (skill) return { skill, reason: route.reason };
    }
  }

  const [best] = searchSkills(catalog, normalized, 1);
  if (best) {
    const skill = findSkill(catalog, { name: best.name });
    if (skill) return { skill, reason: "matched the closest skill by aliases and description" };
  }

  const fallback = findSkill(catalog, { name: "sqlitedata-swift" });
  return fallback ? { skill: fallback, reason: "fell back to the broad SQLiteData router" } : null;
}

export function buildAskResponse(catalog, question, options = {}) {
  const route = routeAsk(catalog, question);
  if (!route) return null;

  const { skill, reason } = route;
  const lines = [
    `Recommended skill: ${skill.name}`,
    `Title: ${skill.title}`,
    `Why: ${reason}`,
    `Resource URI: ${skill.uri}`,
  ];
  if (skill.description) lines.push(`Description: ${skill.description}`);
  if (options.includeSkillContent !== false) {
    lines.push("", "---", "", skill.markdown.trim());
  }
  return lines.join("\n");
}

export function getPrompt(catalog, name, args = {}) {
  const command = catalog.commandByName.get(String(name).toLowerCase());
  if (!command) return null;

  if (command.name === "ask") {
    const question = String(args.question ?? args.arguments ?? "").trim();
    const routed = question ? buildAskResponse(catalog, question, { includeSkillContent: true }) : null;
    return {
      description: command.description,
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: routed
            ? `${routed}\n\n---\n\nPrompt template:\n\n${command.markdown.trim()}`
            : command.markdown.trim(),
        },
      }],
    };
  }

  const suffix = String(args.area ?? args.arguments ?? "").trim();
  return {
    description: command.description,
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: suffix ? `${command.markdown.trim()}\n\nArguments: ${suffix}` : command.markdown.trim(),
      },
    }],
  };
}
