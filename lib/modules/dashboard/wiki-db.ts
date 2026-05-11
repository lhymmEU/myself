/**
 * Supabase-backed wiki: `wiki_pages` + `wiki_log_entries`.
 */
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { wikiLogEntries, wikiPages } from "@/lib/db/schema";
import {
  AGENTS_TEMPLATE,
  INDEX_TEMPLATE,
  LOG_BOOTSTRAP_LINE,
  WIKI_SLUG_AGENTS,
  WIKI_SLUG_INDEX,
} from "./wiki-templates";

function slugSafe(slug: string): string {
  if (!/^[a-zA-Z0-9_\-/]+$/.test(slug)) {
    throw new Error(`Invalid wiki slug: ${slug}`);
  }
  if (slug.includes("..")) {
    throw new Error(`Invalid wiki slug: ${slug}`);
  }
  return slug;
}

/** Idempotent seed: AGENTS + index pages and first log line. */
export async function ensureWikiVault(userId: string): Promise<void> {
  const db = getDb();
  const now = Date.now();

  const existingAgents = await db
    .select({ slug: wikiPages.slug })
    .from(wikiPages)
    .where(
      and(eq(wikiPages.userId, userId), eq(wikiPages.slug, WIKI_SLUG_AGENTS)),
    )
    .limit(1);
  if (!existingAgents[0]) {
    await db.insert(wikiPages).values({
      userId,
      slug: WIKI_SLUG_AGENTS,
      markdown: AGENTS_TEMPLATE,
      updatedAt: now,
    });
  }

  const existingIndex = await db
    .select({ slug: wikiPages.slug })
    .from(wikiPages)
    .where(and(eq(wikiPages.userId, userId), eq(wikiPages.slug, WIKI_SLUG_INDEX)))
    .limit(1);
  if (!existingIndex[0]) {
    await db.insert(wikiPages).values({
      userId,
      slug: WIKI_SLUG_INDEX,
      markdown: INDEX_TEMPLATE,
      updatedAt: now,
    });
  }

  const anyLog = await db
    .select({ id: wikiLogEntries.id })
    .from(wikiLogEntries)
    .where(eq(wikiLogEntries.userId, userId))
    .limit(1);
  if (!anyLog[0]) {
    await db.insert(wikiLogEntries).values({
      id: nanoid(),
      userId,
      body: LOG_BOOTSTRAP_LINE,
      createdAt: now,
    });
  }
}

export async function isWikiVaultReady(userId: string): Promise<boolean> {
  const db = getDb();
  const row = await db
    .select({ slug: wikiPages.slug })
    .from(wikiPages)
    .where(
      and(eq(wikiPages.userId, userId), eq(wikiPages.slug, WIKI_SLUG_AGENTS)),
    )
    .limit(1);
  return !!row[0];
}

export async function readWikiPage(
  userId: string,
  slug: string,
): Promise<string | null> {
  slugSafe(slug);
  const db = getDb();
  const rows = await db
    .select({ markdown: wikiPages.markdown })
    .from(wikiPages)
    .where(and(eq(wikiPages.userId, userId), eq(wikiPages.slug, slug)))
    .limit(1);
  return rows[0]?.markdown ?? null;
}

export async function writeWikiPage(
  userId: string,
  slug: string,
  markdown: string,
): Promise<void> {
  slugSafe(slug);
  const db = getDb();
  const now = Date.now();
  await db
    .insert(wikiPages)
    .values({ userId, slug, markdown, updatedAt: now })
    .onConflictDoUpdate({
      target: [wikiPages.userId, wikiPages.slug],
      set: { markdown, updatedAt: now },
    });
}

export async function appendWikiLog(userId: string, entry: string): Promise<void> {
  const line = entry.endsWith("\n") ? entry.slice(0, -1) : entry;
  await getDb().insert(wikiLogEntries).values({
    id: nanoid(),
    userId,
    body: line,
    createdAt: Date.now(),
  });
}

export async function readWikiLog(
  userId: string,
  tailLines: number = 50,
): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ body: wikiLogEntries.body })
    .from(wikiLogEntries)
    .where(eq(wikiLogEntries.userId, userId))
    .orderBy(desc(wikiLogEntries.createdAt))
    .limit(tailLines);
  return rows
    .reverse()
    .map((r) => r.body)
    .join("\n");
}

export async function searchWiki(
  userId: string,
  query: string,
  max: number = 12,
): Promise<Array<{ slug: string; excerpt: string }>> {
  const needle = query.toLowerCase().trim();
  if (!needle) return [];

  const esc = needle.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const pattern = `%${esc}%`;

  const db = getDb();
  const rows = await db
    .select({ slug: wikiPages.slug, markdown: wikiPages.markdown })
    .from(wikiPages)
    .where(
      and(
        eq(wikiPages.userId, userId),
        ne(wikiPages.slug, WIKI_SLUG_AGENTS),
        sql`LOWER(${wikiPages.markdown}) LIKE LOWER(${pattern}) ESCAPE '\\'`,
      ),
    )
    .limit(max);

  const results: Array<{ slug: string; excerpt: string }> = [];
  for (const row of rows) {
    const raw = row.markdown;
    const idx = raw.toLowerCase().indexOf(needle);
    if (idx < 0) continue;
    const start = Math.max(0, idx - 60);
    const end = Math.min(raw.length, idx + needle.length + 120);
    results.push({ slug: row.slug, excerpt: raw.slice(start, end).trim() });
  }
  return results;
}

export async function readAgentsMd(userId: string): Promise<string> {
  const md = await readWikiPage(userId, WIKI_SLUG_AGENTS);
  return md ?? AGENTS_TEMPLATE;
}

/** Legacy no-op: dashboard cards live in \`dashboard_cards\`; JSON file unused. */
export function readDashboardJson(): null {
  return null;
}
