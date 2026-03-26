import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MiniSearch from "minisearch";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve skills/commands from repo checkout or packaged dist/
function resolveRoot(name) {
  const repoPath = path.resolve(__dirname, "../../", name);
  if (existsSync(repoPath)) return repoPath;
  const distPath = path.resolve(__dirname, "../dist/", name);
  if (existsSync(distPath)) return distPath;
  return repoPath; // fall back to repo path for error messages
}

export const DEFAULT_SKILLS_ROOT = resolveRoot("skills");
export const DEFAULT_COMMANDS_ROOT = resolveRoot("commands");

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Section Parsing ─────────────────────────────────────────────────────────

function parseSections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];
  let currentHeading = "_preamble";
  let currentStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^(#{1,2})\s+(.+)$/);
    if (headingMatch) {
      if (i > currentStart) {
        const content = lines.slice(currentStart, i).join("\n");
        sections.push({
          heading: currentHeading,
          startLine: currentStart,
          endLine: i - 1,
          charCount: content.length,
        });
      }
      currentHeading = headingMatch[2].trim();
      currentStart = i;
    }
  }

  // Final section
  const content = lines.slice(currentStart).join("\n");
  sections.push({
    heading: currentHeading,
    startLine: currentStart,
    endLine: lines.length - 1,
    charCount: content.length,
  });

  return sections;
}

// ── MiniSearch Index ────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
  "has", "have", "how", "i", "in", "is", "it", "its", "my", "of",
  "on", "or", "that", "the", "this", "to", "was", "were", "will",
  "with", "you", "your", "do", "does", "what", "when", "where",
]);

function tokenize(text) {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9@_]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const MINISEARCH_OPTIONS = {
  fields: ["nameText", "description", "tags", "body"],
  storeFields: ["description", "category", "kind"],
  idField: "name",
  tokenize,
  searchOptions: {
    boost: { nameText: 3, description: 2, tags: 2, body: 1 },
    fuzzy: 0.2,
    prefix: true,
  },
};

function buildIndex(skills) {
  const engine = new MiniSearch(MINISEARCH_OPTIONS);
  const documents = skills.map((s) => ({
    name: s.name,
    nameText: s.name.replace(/[-_]/g, " "),
    description: s.description,
    tags: [
      ...s.aliases,
      ...(s.triggerQueries || []),
    ].join(" "),
    body: s.markdown,
    category: s.category,
    kind: s.kind,
  }));
  engine.addAll(documents);
  return engine;
}

// ── Catalog Loading ─────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  entrypoints: "Getting Started",
  patterns: "Core Patterns",
  sync: "CloudKit Sync",
  reference: "API Reference",
  diagnostics: "Diagnostics",
  "apple-docs": "Apple Documentation",
};

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
      triggerQueries: Array.isArray(metadata.trigger_queries) ? metadata.trigger_queries : [],
      relatedSkills: Array.isArray(metadata.related_skills) ? metadata.related_skills : [],
      sections: parseSections(body),
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
      const cmdName = path.basename(entry.name, ".md");

      commands.push({
        name: cmdName,
        title: extractTitle(body, cmdName),
        description: attributes.description || "",
        argumentHint: attributes["argument-hint"] || "",
        markdown,
        uri: `sqlitedata-swift://commands/${encodeURIComponent(cmdName)}`,
        relativePath: toPosixPath(path.relative(commandsRoot, commandPath)),
      });
    }
  }
  commands.sort((a, b) => a.name.localeCompare(b.name));

  const searchIndex = buildIndex(skills);

  return {
    skills,
    commands,
    searchIndex,
    skillByName: new Map(skills.map((s) => [s.name.toLowerCase(), s])),
    skillByUri: new Map(skills.map((s) => [s.uri, s])),
    commandByName: new Map(commands.map((c) => [c.name.toLowerCase(), c])),
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

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

export function searchSkills(catalog, query, options = {}) {
  const trimmed = String(query ?? "").trim();
  if (!trimmed) return [];

  const limit = options.limit ?? 10;
  const queryTerms = tokenize(trimmed);

  const results = catalog.searchIndex.search(trimmed, {
    filter: (result) => {
      if (options.category && result.category !== options.category) return false;
      if (options.kind && result.kind !== options.kind) return false;
      return true;
    },
  });

  return results.slice(0, limit).map((hit) => {
    const skill = findSkill(catalog, { name: hit.id });
    const matchingSections = [];
    if (skill) {
      for (const section of skill.sections) {
        const lines = skill.markdown.split("\n").slice(section.startLine, section.endLine + 1);
        const sectionText = section.heading + " " + lines.join(" ");
        const sectionTokens = new Set(tokenize(sectionText));
        if (queryTerms.some((qt) => sectionTokens.has(qt))) {
          matchingSections.push(section.heading);
        }
      }
    }

    return {
      name: hit.id,
      score: Math.round(hit.score * 100) / 100,
      description: hit.description ?? "",
      category: hit.category ?? null,
      kind: hit.kind ?? null,
      matchingSections,
    };
  });
}

export function getSkillSections(catalog, name, sectionNames) {
  const skill = findSkill(catalog, { name });
  if (!skill) return null;

  if (!sectionNames || sectionNames.length === 0) {
    return { skill, content: skill.markdown, sections: skill.sections };
  }

  const lines = skill.markdown.split("\n");
  const matched = [];
  const matchedContent = [];

  for (const section of skill.sections) {
    const lowerHeading = section.heading.toLowerCase();
    if (sectionNames.some((s) => lowerHeading.includes(s.toLowerCase()))) {
      matched.push(section);
      matchedContent.push(lines.slice(section.startLine, section.endLine + 1).join("\n"));
    }
  }

  return {
    skill,
    content: matchedContent.join("\n\n"),
    sections: matched,
  };
}

export function getCatalog(catalog, category) {
  const categories = {};

  for (const skill of catalog.skills) {
    const cat = skill.category || "uncategorized";
    if (category && cat !== category) continue;

    if (!categories[cat]) {
      categories[cat] = {
        label: CATEGORY_LABELS[cat] || cat,
        skills: [],
      };
    }
    categories[cat].skills.push({
      name: skill.name,
      description: skill.description,
      kind: skill.kind,
    });
  }

  return {
    categories,
    totalSkills: catalog.skills.length,
  };
}

export function getPrompt(catalog, name, args = {}) {
  const command = catalog.commandByName.get(String(name).toLowerCase());
  if (!command) return null;

  if (command.name === "ask") {
    const question = String(args.question ?? args.arguments ?? "").trim();
    let preamble = "";
    if (question) {
      const results = searchSkills(catalog, question, { limit: 3 });
      if (results.length > 0) {
        const best = findSkill(catalog, { name: results[0].name });
        if (best) {
          preamble = [
            `Top skill match: ${best.name}`,
            `Description: ${best.description}`,
            "",
            "---",
            "",
            best.markdown.trim(),
          ].join("\n");
        }
      }
    }

    return {
      description: command.description,
      messages: [{
        role: "user",
        content: {
          type: "text",
          text: preamble
            ? `${preamble}\n\n---\n\nPrompt template:\n\n${command.markdown.trim()}`
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
