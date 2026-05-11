/**
 * Agent tools openclaw uses while running in wiki-maintainer mode.
 *
 * These complement the per-feature tools defined in tools.ts; the bento
 * dashboard relies on this module to:
 *   - Read raw sources (plans, marked, wishes, skills) — Karpathy's "raw layer".
 *   - Read / write wiki pages on disk under data/wiki/.
 *   - Append to log.md and search the wiki.
 *   - Publish the bento payload via publishDashboard so the UI sees fresh cards.
 *   - Read pending user verbs so user actions become wiki maintenance.
 */
import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import { listUserWishes, listUserSkills } from "./actions";
import { getAllPlans } from "@/lib/modules/plans/actions";
import { listCollections, listItems } from "@/lib/modules/marked/actions";
import {
  publishDashboard,
  listPendingDismissals,
  markDismissalsIngested,
} from "./insights-actions";
import {
  readWikiPage,
  writeWikiPage,
  appendLog,
  readLog,
  searchWiki,
  readDashboardJson,
} from "./wiki-vault";

const sourceRefSchema = z.object({
  kind: z.enum(["plan", "marked", "wish", "skill"]),
  id: z.string(),
  range: z.string().optional(),
  label: z.string().optional(),
});

const cardKindSchema = z.enum([
  "synthesis",
  "lint",
  "gap",
  "query",
  "heartbeat",
]);

const cardConfidenceSchema = z.enum(["strong", "thin", "contradicted"]);

const publishCardSchema = z.object({
  id: z.string().optional(),
  kind: cardKindSchema,
  title: z.string(),
  body: z.string().optional(),
  hue: z.number().optional(),
  freshness: z.number().optional(),
  confidence: cardConfidenceSchema.optional(),
  sources: z.array(sourceRefSchema).optional(),
  wikiSlug: z.string().nullable().optional(),
  pinnedGoalId: z.string().nullable().optional(),
  priority: z.number().optional(),
});

export const dashboardWikiTools: AgentTool[] = [
  {
    name: "readRawSources",
    description:
      "Read the user's raw sources for wiki ingest. Returns plans, marked URL items + collections, wishes (learn / places / goals), and user skills. Use this as the starting point for every ingest or lint pass. The wiki itself is read via readWikiPage / searchWiki.",
    parameters: z.object({
      kinds: z
        .array(z.enum(["plans", "marked", "wishes", "wishlist", "skills"]))
        .optional(),
    }),
    handler: async (params) => {
      const uid = getAgentToolUserId();
      const { kinds } = params as {
        kinds?: Array<"plans" | "marked" | "wishes" | "wishlist" | "skills">;
      };
      const normalizedKinds =
        kinds && kinds.length > 0
          ? kinds.map((k) => (k === "wishlist" ? "wishes" : k))
          : ["plans", "marked", "wishes", "skills"];
      const wanted = new Set(normalizedKinds);

      const out: Record<string, unknown> = {};
      if (wanted.has("plans")) {
        out.plans = await getAllPlans(uid);
      }
      if (wanted.has("marked")) {
        const [collections, items] = await Promise.all([
          listCollections(uid),
          listItems(undefined, uid),
        ]);
        out.marked = { collections, items };
      }
      if (wanted.has("wishes")) {
        out.wishes = await listUserWishes(uid);
      }
      if (wanted.has("skills")) {
        out.skills = await listUserSkills(uid);
      }
      return out;
    },
  },
  {
    name: "readWikiPage",
    description:
      "Read a single wiki page by slug. Slug is the path under data/wiki/ without the .md extension, e.g. 'syntheses/learning-rust' or 'entities/career'. Returns null if the page does not exist.",
    parameters: z.object({ slug: z.string() }),
    handler: async (params) => {
      const { slug } = params as { slug: string };
      try {
        const markdown = readWikiPage(slug);
        return { slug, markdown };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "read failed",
          slug,
          markdown: null,
        };
      }
    },
  },
  {
    name: "writeWikiPage",
    description:
      "Create or overwrite a wiki page. Slug is the path under data/wiki/ without the .md extension, e.g. 'syntheses/learning-rust'. The markdown body should include YAML frontmatter following the schema in AGENTS.md (kind / goalId / confidence / freshness / sources). Auto-creates parent directories.",
    parameters: z.object({
      slug: z.string(),
      markdown: z.string(),
    }),
    handler: async (params) => {
      const { slug, markdown } = params as { slug: string; markdown: string };
      try {
        writeWikiPage(slug, markdown);
        return { slug, written: true };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "write failed",
          slug,
          written: false,
        };
      }
    },
  },
  {
    name: "appendWikiLog",
    description:
      "Append one line to data/wiki/log.md. Use the format '## [YYYY-MM-DD] <op> | <summary>' so entries stay grep-able. <op> should be one of: ingest, lint, query, init.",
    parameters: z.object({ entry: z.string() }),
    handler: async (params) => {
      const { entry } = params as { entry: string };
      appendLog(entry);
      return { appended: true };
    },
  },
  {
    name: "readWikiLog",
    description:
      "Return the last N lines of data/wiki/log.md (default 50). Useful for the heartbeat card and for understanding what was already done recently.",
    parameters: z.object({ tail: z.number().optional() }),
    handler: async (params) => {
      const { tail } = params as { tail?: number };
      return { log: readLog(tail ?? 50) };
    },
  },
  {
    name: "searchWiki",
    description:
      "Naive substring search across all wiki pages (excluding AGENTS.md). Returns up to 12 hits with the matching slug and a small excerpt. Use this when you need cross-reference info while writing a synthesis page.",
    parameters: z.object({
      query: z.string(),
      max: z.number().optional(),
    }),
    handler: async (params) => {
      const { query, max } = params as { query: string; max?: number };
      return { hits: searchWiki(query, max ?? 12) };
    },
  },
  {
    name: "publishDashboard",
    description:
      "Replace the active bento card set with the provided list. The UI re-renders immediately. Cap is 9 cards (extras silently dropped). Card kinds: synthesis, lint, gap, query, heartbeat. Always include exactly one heartbeat card. Each card MUST point at a real wikiSlug (use writeWikiPage first if needed).",
    parameters: z.object({ cards: z.array(publishCardSchema) }),
    handler: async (params) => {
      const { cards } = params as { cards: unknown[] };
      const result = await publishDashboard(
        cards as Parameters<typeof publishDashboard>[0],
        getAgentToolUserId(),
      );
      return result;
    },
  },
  {
    name: "readDashboardJson",
    description:
      "Optional legacy read of data/wiki/dashboard.json on the API host (often empty). Prefer stdout handoff for wiki ingest; do not rely on this file for the canonical dashboard.",
    parameters: z.object({}),
    handler: async () => readDashboardJson() ?? { generatedAt: 0, cards: [] },
  },
  {
    name: "readPendingDismissals",
    description:
      "Read user verbs (confirm/contradict/expand/archive/dismiss/pin/unpin) that haven't been incorporated into the wiki yet. After processing them, call markDismissalsIngested with the same ids.",
    parameters: z.object({}),
    handler: async () => ({
      dismissals: await listPendingDismissals(getAgentToolUserId()),
    }),
  },
  {
    name: "markDismissalsIngested",
    description:
      "Mark the given dismissal ids as processed. Call this after you've updated the affected wiki pages so the same actions aren't replayed on the next ingest pass.",
    parameters: z.object({ ids: z.array(z.string()) }),
    handler: async (params) => {
      const { ids } = params as { ids: string[] };
      await markDismissalsIngested(ids, getAgentToolUserId());
      return { count: ids.length };
    },
  },
];
