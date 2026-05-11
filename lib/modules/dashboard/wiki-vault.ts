/**
 * Local-mode wiki vault — Karpathy's "LLM Wiki" pattern materialised on disk.
 *
 * The vault lives next to `data/dashboard.db`. It contains a small set of
 * markdown files openclaw owns and maintains. The bento UI never writes here
 * directly; openclaw is the only writer (via the agent tools in tools.ts).
 *
 * In cloud mode, this module short-circuits and path helpers no-op. Card rows
 * come from publishDashboard / agent stdout handoff into SQLite — not from a
 * local dashboard.json file.
 *
 * Primary wiki content is maintained on the openclaw host. Local paths below
 * support HTTP agent tools and legacy reads only.
 *
 * Files seeded on first run (Karpathy 3-layer pattern):
 *   AGENTS.md      — schema + workflow rules for openclaw (the wiki-maintainer prompt)
 *   index.md       — content-oriented catalogue of every wiki page
 *   log.md         — chronological append-only record of ingest/lint/query passes
 *   entities/      — one page per goal, skill, or named entity
 *   syntheses/     — synthesis pages backing synthesis cards
 *   queries/       — pinned-query pages
 */
import { isLocal } from "@/lib/core/runtime";

interface VaultPaths {
  root: string;
  agentsMd: string;
  indexMd: string;
  logMd: string;
  dashboardJson: string;
  entitiesDir: string;
  synthesesDir: string;
  queriesDir: string;
}

let _initialised = false;

function getVaultPaths(): VaultPaths | null {
  if (!isLocal()) return null;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const dataRoot = process.env.DATA_DIR || process.cwd();
  const root = path.join(dataRoot, "data", "wiki");
  return {
    root,
    agentsMd: path.join(root, "AGENTS.md"),
    indexMd: path.join(root, "index.md"),
    logMd: path.join(root, "log.md"),
    dashboardJson: path.join(root, "dashboard.json"),
    entitiesDir: path.join(root, "entities"),
    synthesesDir: path.join(root, "syntheses"),
    queriesDir: path.join(root, "queries"),
  };
}

function getFs() {
  /* eslint-disable @typescript-eslint/no-require-imports */
  return require("fs") as typeof import("fs");
  /* eslint-enable @typescript-eslint/no-require-imports */
}

const AGENTS_TEMPLATE = `# AGENTS.md — Wiki maintainer schema

You are openclaw running in **wiki-maintainer mode** for the user's bento dashboard.
This file is the *schema layer* in Karpathy's LLM-Wiki three-layer pattern. It
tells you how the wiki is structured, what the conventions are, and which
workflows to follow for ingest, query, and lint.

## Three layers

- **Raw layer** — the user's plans, marked items, wishes (learn / places / goals), and skills,
  exposed via the agent tools. Never edited by you.
- **Wiki layer** — every markdown file under \`data/wiki/\`. You own this.
- **Schema layer** — this file. Co-evolves with the user.

## Operations

### Ingest
A new or updated source arrives. You:
1. Read it via the agent tools (\`readRawSources\`).
2. Identify which entity / synthesis / query pages it touches.
3. Update each affected page (\`writeWikiPage\`). Strengthen, contradict, or
   replace claims. Update YAML frontmatter (\`freshness\`, \`confidence\`).
4. Append a log entry: \`## [YYYY-MM-DD] ingest | <one-line summary>\`.
5. Refresh the dashboard via \`publishDashboard\`.

### Query
The user asks a question. You:
1. Read \`index.md\` to find relevant pages.
2. Synthesise an answer with citations (\`source: plan:<id>\` or
   \`source: marked:<id>\`).
3. If the user pins the answer, write it to \`queries/<slug>.md\` and append
   \`## [YYYY-MM-DD] query | <question>\` to \`log.md\`.

### Lint
Periodic health check. Surface as **lint** cards via \`publishDashboard\`:
- Stale claims (sources newer than the last update).
- Contradictions between pages.
- Orphan pages with no inbound links.
- Concepts mentioned but lacking a page.
- Goals with no recent sources → emit a **gap** card.

## Wiki page anatomy (every \`.md\` under \`data/wiki/\` except this one)

\`\`\`yaml
---
kind: synthesis | entity | query | concept
goalId: <id from user_wishes or null>
confidence: strong | thin | contradicted
freshness: <epoch ms of the last source it draws from>
sources:
  - { kind: plan,   id: "<id>", range: "<line:line>" }
  - { kind: marked, id: "<id>" }
  - { kind: wish,   id: "<id>" }
---
\`\`\`

Body: a TL;DR, then claims with inline citations like \`^[plan:abc:42-58]\`,
then a \`## Linked\` section listing related pages.

## Dashboard contract

When publishing the bento via \`publishDashboard({ cards })\`:
- Emit at most **9 cards** including exactly **one heartbeat** card.
- Card kinds: \`synthesis | lint | gap | query | heartbeat\`.
- Each card MUST carry \`{ id, kind, title, body, hue, freshness, confidence,
  sources, wikiSlug }\`. Set \`pinnedGoalId\` when a card belongs to a goal.
- Honour the user's verbs in \`card_dismissals\` (read via \`readDismissals\`).
  Archive cards the user archived; refresh the ones they confirmed.

## Logging convention

Every line that begins with \`## [\` is a parseable log entry. Keep it terse:

\`\`\`
## [2026-04-02] ingest | New marked URL: https://...
## [2026-04-02] lint   | 2 contradictions, 1 stale claim refreshed
## [2026-04-02] query  | "am I overcommitted?"
\`\`\`

## What you NEVER do

- Modify raw sources (plans, marked, wishes, skills). Read-only.
- Emit a card without a \`wikiSlug\` pointing at a real page.
- Drop the heartbeat card.
- Make up sources. If you have no source, surface a **gap** card instead.
`;

const INDEX_TEMPLATE = `# Wiki index

This file is content-oriented: a catalogue of every page in the wiki.
openclaw maintains it on every ingest.

## Entities

_(none yet — add a wish on the Wishlist page, then run an ingest pass)_

## Syntheses

_(none yet)_

## Queries

_(none yet)_
`;

const LOG_TEMPLATE = `# Wiki log

Append-only chronological record. Lines starting with \`## [\` are parseable
with \`grep "^## \\[" log.md | tail -n 5\`.

## [bootstrap] init | wiki vault created
`;

/**
 * Idempotent. Creates the vault on first run, leaves it alone afterwards.
 * Local mode only; cloud is a no-op (the remote machine owns the files).
 */
export function ensureVault(): VaultPaths | null {
  if (!isLocal()) return null;
  const paths = getVaultPaths();
  if (!paths) return null;

  const fs = getFs();
  if (!fs.existsSync(paths.root)) fs.mkdirSync(paths.root, { recursive: true });
  if (!fs.existsSync(paths.entitiesDir)) fs.mkdirSync(paths.entitiesDir);
  if (!fs.existsSync(paths.synthesesDir)) fs.mkdirSync(paths.synthesesDir);
  if (!fs.existsSync(paths.queriesDir)) fs.mkdirSync(paths.queriesDir);

  if (!fs.existsSync(paths.agentsMd)) {
    fs.writeFileSync(paths.agentsMd, AGENTS_TEMPLATE, "utf-8");
  }
  if (!fs.existsSync(paths.indexMd)) {
    fs.writeFileSync(paths.indexMd, INDEX_TEMPLATE, "utf-8");
  }
  if (!fs.existsSync(paths.logMd)) {
    fs.writeFileSync(paths.logMd, LOG_TEMPLATE, "utf-8");
  }

  _initialised = true;
  return paths;
}

export function isVaultReady(): boolean {
  if (!isLocal()) return false;
  if (_initialised) return true;
  const paths = getVaultPaths();
  if (!paths) return false;
  const fs = getFs();
  return (
    fs.existsSync(paths.agentsMd) &&
    fs.existsSync(paths.indexMd) &&
    fs.existsSync(paths.logMd)
  );
}

export interface DashboardJson {
  generatedAt: number;
  cards: unknown[];
}

/** Legacy / optional; openclaw does not rely on this file for the bento. */
export function readDashboardJson(): DashboardJson | null {
  const paths = ensureVault();
  if (!paths) return null;
  const fs = getFs();
  try {
    const raw = fs.readFileSync(paths.dashboardJson, "utf-8");
    return JSON.parse(raw) as DashboardJson;
  } catch {
    return null;
  }
}

function slugSafe(slug: string): string {
  // Reject path-traversal, only allow letters, numbers, dashes, underscores,
  // forward slashes for sub-folders (entities/foo, syntheses/bar).
  if (!/^[a-zA-Z0-9_\-/]+$/.test(slug)) {
    throw new Error(`Invalid wiki slug: ${slug}`);
  }
  if (slug.includes("..")) {
    throw new Error(`Invalid wiki slug: ${slug}`);
  }
  return slug;
}

function pathForSlug(slug: string): string | null {
  const paths = ensureVault();
  if (!paths) return null;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const safe = slugSafe(slug);
  return path.join(paths.root, `${safe}.md`);
}

export function readWikiPage(slug: string): string | null {
  const file = pathForSlug(slug);
  if (!file) return null;
  const fs = getFs();
  try {
    return fs.readFileSync(file, "utf-8");
  } catch {
    return null;
  }
}

export function writeWikiPage(slug: string, markdown: string): void {
  const file = pathForSlug(slug);
  if (!file) return;
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */
  const fs = getFs();
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, markdown, "utf-8");
}

export function appendLog(entry: string): void {
  const paths = ensureVault();
  if (!paths) return;
  const fs = getFs();
  const line = entry.endsWith("\n") ? entry : `${entry}\n`;
  fs.appendFileSync(paths.logMd, line, "utf-8");
}

export function readLog(tailLines: number = 50): string {
  const paths = ensureVault();
  if (!paths) return "";
  const fs = getFs();
  try {
    const raw = fs.readFileSync(paths.logMd, "utf-8");
    const lines = raw.split("\n");
    return lines.slice(Math.max(0, lines.length - tailLines)).join("\n");
  } catch {
    return "";
  }
}

export function searchWiki(query: string, max: number = 12): Array<{
  slug: string;
  excerpt: string;
}> {
  const paths = ensureVault();
  if (!paths) return [];
  const fs = getFs();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const path = require("path");
  /* eslint-enable @typescript-eslint/no-require-imports */

  const needle = query.toLowerCase().trim();
  if (!needle) return [];

  const results: Array<{ slug: string; excerpt: string }> = [];

  function walk(dir: string, rel: string = "") {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, relPath);
      } else if (entry.name.endsWith(".md") && entry.name !== "AGENTS.md") {
        const raw = fs.readFileSync(full, "utf-8");
        const idx = raw.toLowerCase().indexOf(needle);
        if (idx >= 0) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(raw.length, idx + needle.length + 120);
          const slug = relPath.replace(/\.md$/, "");
          results.push({ slug, excerpt: raw.slice(start, end).trim() });
          if (results.length >= max) return;
        }
      }
    }
  }

  walk(paths.root);
  return results.slice(0, max);
}

/**
 * Returns AGENTS.md so the wiki preamble can include a verbatim copy or
 * a hash for cache invalidation.
 */
export function readAgentsMd(): string {
  const paths = ensureVault();
  if (!paths) return AGENTS_TEMPLATE;
  const fs = getFs();
  try {
    return fs.readFileSync(paths.agentsMd, "utf-8");
  } catch {
    return AGENTS_TEMPLATE;
  }
}
