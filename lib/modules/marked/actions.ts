import { nanoid } from "nanoid";
import { and, eq, asc, sql, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/core/event-bus";
import { markedCollections, markedItems } from "./schema";
import { MARKED_EVENTS } from "./events";
import type {
  MarkedCollection,
  MarkedItem,
  CreateCollectionInput,
  UpdateCollectionInput,
  CreateItemInput,
  UpdateItemInput,
  UrlMeta,
  MarkedPayload,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function makeSlug(name: string): string {
  return `${slugify(name)}-${nanoid(4)}`;
}

function normalizeCollection(
  row: typeof markedCollections.$inferSelect,
): MarkedCollection {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function normalizeItem(row: typeof markedItems.$inferSelect): MarkedItem {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function listCollections(
  userId: string,
): Promise<MarkedCollection[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(markedCollections)
    .where(eq(markedCollections.userId, userId))
    .orderBy(asc(markedCollections.sortOrder));
  return rows.map(normalizeCollection);
}

export async function getCollection(
  id: string,
  userId: string,
): Promise<MarkedCollection | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(markedCollections)
    .where(
      and(eq(markedCollections.id, id), eq(markedCollections.userId, userId)),
    )
    .limit(1);
  const row = rows[0];
  return row ? normalizeCollection(row) : null;
}

export async function createCollection(
  input: CreateCollectionInput,
  userId: string,
): Promise<MarkedCollection> {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const maxRows = await db
    .select({
      max: sql<number>`COALESCE(MAX(${markedCollections.sortOrder}), -1)`,
    })
    .from(markedCollections)
    .where(eq(markedCollections.userId, userId));
  const sortOrder = Number(maxRows[0]?.max ?? -1) + 1;
  const row = {
    id,
    userId,
    name: input.name,
    notes: input.notes ?? null,
    slug: makeSlug(input.name),
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(markedCollections).values(row);
  const result = normalizeCollection(row as typeof markedCollections.$inferSelect);
  eventBus.emit("marked", MARKED_EVENTS.COLLECTION_CREATED, result);
  return result;
}

export async function updateCollection(
  input: UpdateCollectionInput,
  userId: string,
): Promise<MarkedCollection> {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(markedCollections)
    .where(
      and(
        eq(markedCollections.id, input.id),
        eq(markedCollections.userId, userId),
      ),
    )
    .limit(1);
  if (!existingRows[0]) throw new Error(`Collection not found: ${input.id}`);

  const updates: Partial<typeof markedCollections.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) {
    updates.name = input.name;
    updates.slug = makeSlug(input.name);
  }
  if (input.notes !== undefined) updates.notes = input.notes;

  await db
    .update(markedCollections)
    .set(updates)
    .where(
      and(
        eq(markedCollections.id, input.id),
        eq(markedCollections.userId, userId),
      ),
    );
  const rows = await db
    .select()
    .from(markedCollections)
    .where(
      and(
        eq(markedCollections.id, input.id),
        eq(markedCollections.userId, userId),
      ),
    )
    .limit(1);
  const result = normalizeCollection(rows[0]!);
  eventBus.emit("marked", MARKED_EVENTS.COLLECTION_UPDATED, result);
  return result;
}

export async function deleteCollection(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(markedItems)
    .set({ collectionId: null })
    .where(
      and(
        eq(markedItems.collectionId, id),
        eq(markedItems.userId, userId),
      ),
    );
  await db
    .delete(markedCollections)
    .where(
      and(
        eq(markedCollections.id, id),
        eq(markedCollections.userId, userId),
      ),
    );
  eventBus.emit("marked", MARKED_EVENTS.COLLECTION_DELETED, { id });
}

export async function reorderCollections(
  ids: string[],
  userId: string,
): Promise<void> {
  const db = getDb();
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(markedCollections)
      .set({ sortOrder: index })
      .where(
        and(
          eq(markedCollections.id, id),
          eq(markedCollections.userId, userId),
        ),
      );
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItems(
  collectionId?: string | null,
  userId: string,
): Promise<MarkedItem[]> {
  const db = getDb();
  if (collectionId === "__uncollected__") {
    const rows = await db
      .select()
      .from(markedItems)
      .where(
        and(eq(markedItems.userId, userId), isNull(markedItems.collectionId)),
      )
      .orderBy(asc(markedItems.sortOrder));
    return rows.map(normalizeItem);
  }
  if (collectionId) {
    const rows = await db
      .select()
      .from(markedItems)
      .where(
        and(
          eq(markedItems.userId, userId),
          eq(markedItems.collectionId, collectionId),
        ),
      )
      .orderBy(asc(markedItems.sortOrder));
    return rows.map(normalizeItem);
  }
  const rows = await db
    .select()
    .from(markedItems)
    .where(eq(markedItems.userId, userId))
    .orderBy(asc(markedItems.sortOrder));
  return rows.map(normalizeItem);
}

export async function getItem(
  id: string,
  userId: string,
): Promise<MarkedItem | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(markedItems)
    .where(and(eq(markedItems.id, id), eq(markedItems.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? normalizeItem(row) : null;
}

export async function createItem(
  input: CreateItemInput,
  userId: string,
): Promise<MarkedItem> {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const maxRows = await db
    .select({
      max: sql<number>`COALESCE(MAX(${markedItems.sortOrder}), -1)`,
    })
    .from(markedItems)
    .where(eq(markedItems.userId, userId));
  const sortOrder = Number(maxRows[0]?.max ?? -1) + 1;
  const row = {
    id,
    userId,
    url: input.url,
    title: input.title,
    sourceTag: input.sourceTag ?? generateSourceTag(input.url, input.title),
    notes: input.notes ?? null,
    favicon: input.favicon ?? null,
    ogImage: input.ogImage ?? null,
    ogDescription: input.ogDescription ?? null,
    collectionId: input.collectionId ?? null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(markedItems).values(row);
  const result = normalizeItem(row as typeof markedItems.$inferSelect);
  eventBus.emit("marked", MARKED_EVENTS.ITEM_CREATED, result);
  return result;
}

export async function updateItem(
  input: UpdateItemInput,
  userId: string,
): Promise<MarkedItem> {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(markedItems)
    .where(and(eq(markedItems.id, input.id), eq(markedItems.userId, userId)))
    .limit(1);
  if (!existingRows[0]) throw new Error(`Item not found: ${input.id}`);

  const updates: Partial<typeof markedItems.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.url !== undefined) updates.url = input.url;
  if (input.title !== undefined) updates.title = input.title;
  if (input.sourceTag !== undefined) updates.sourceTag = input.sourceTag;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.favicon !== undefined) updates.favicon = input.favicon;
  if (input.ogImage !== undefined) updates.ogImage = input.ogImage;
  if (input.ogDescription !== undefined)
    updates.ogDescription = input.ogDescription;
  if (input.collectionId !== undefined)
    updates.collectionId = input.collectionId;

  await db
    .update(markedItems)
    .set(updates)
    .where(and(eq(markedItems.id, input.id), eq(markedItems.userId, userId)));
  const rows = await db
    .select()
    .from(markedItems)
    .where(and(eq(markedItems.id, input.id), eq(markedItems.userId, userId)))
    .limit(1);
  const result = normalizeItem(rows[0]!);
  eventBus.emit("marked", MARKED_EVENTS.ITEM_UPDATED, result);
  return result;
}

export async function deleteItem(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(markedItems)
    .where(and(eq(markedItems.id, id), eq(markedItems.userId, userId)));
  eventBus.emit("marked", MARKED_EVENTS.ITEM_DELETED, { id });
}

export async function moveItemToCollection(
  itemId: string,
  collectionId: string | null,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(markedItems)
    .set({ collectionId, updatedAt: Date.now() })
    .where(and(eq(markedItems.id, itemId), eq(markedItems.userId, userId)));
}

export async function reorderItems(
  ids: string[],
  userId: string,
): Promise<void> {
  const db = getDb();
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(markedItems)
      .set({ sortOrder: index })
      .where(and(eq(markedItems.id, id), eq(markedItems.userId, userId)));
  }
}

// ---------------------------------------------------------------------------
// URL Metadata Fetching
// ---------------------------------------------------------------------------

const KNOWN_DOMAINS: Record<string, string> = {
  "youtube.com": "YouTube",
  "www.youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "github.com": "GitHub",
  "www.github.com": "GitHub",
  "en.wikipedia.org": "Wikipedia",
  "wikipedia.org": "Wikipedia",
  "developer.mozilla.org": "MDN",
  "arxiv.org": "arXiv",
  "www.arxiv.org": "arXiv",
  "stackoverflow.com": "Stack Overflow",
  "www.stackoverflow.com": "Stack Overflow",
  "medium.com": "Medium",
  "twitter.com": "Twitter",
  "x.com": "X",
  "reddit.com": "Reddit",
  "www.reddit.com": "Reddit",
  "docs.google.com": "Google Docs",
  "drive.google.com": "Google Drive",
  "notion.so": "Notion",
  "www.notion.so": "Notion",
  "figma.com": "Figma",
  "www.figma.com": "Figma",
  "linkedin.com": "LinkedIn",
  "www.linkedin.com": "LinkedIn",
  "npmjs.com": "npm",
  "www.npmjs.com": "npm",
  "crates.io": "crates.io",
  "pypi.org": "PyPI",
  "huggingface.co": "Hugging Face",
  "www.huggingface.co": "Hugging Face",
};

export function generateSourceTag(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const brand = KNOWN_DOMAINS[host];
    const pathParts = parsed.pathname
      .split("/")
      .filter(Boolean);

    if (brand) {
      if (brand === "GitHub" && pathParts.length >= 2) {
        return `GitHub ${pathParts[0]}/${pathParts[1]}`;
      }
      if (brand === "YouTube" && pathParts[0] === "watch") {
        return `YouTube`;
      }
      if ((brand === "YouTube") && pathParts[0]?.startsWith("@")) {
        return `YouTube ${pathParts[0]}`;
      }
      if (brand === "Wikipedia" && pathParts[1]) {
        return `Wikipedia: ${decodeURIComponent(pathParts[1]).replace(/_/g, " ")}`;
      }
      if (brand === "MDN" && pathParts.length >= 3) {
        return `MDN: ${pathParts.slice(2).join("/")}`;
      }
      if (brand === "arXiv" && pathParts[1]) {
        return `arXiv ${pathParts[1]}`;
      }
      if (brand === "Reddit" && pathParts[0] === "r" && pathParts[1]) {
        return `Reddit r/${pathParts[1]}`;
      }
      if (brand === "npm" && pathParts[1]) {
        return `npm ${pathParts.slice(1).join("/")}`;
      }
      return brand;
    }

    const domain = host.replace(/^www\./, "");
    const parts = domain.split(".");
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    return name;
  } catch {
    return title || "Link";
  }
}

function extractMetaContent(html: string, property: string): string {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
      "i",
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() ?? "";
}

function extractFavicon(html: string, baseUrl: string): string {
  const m = html.match(
    /<link[^>]+rel=["'](?:icon|shortcut icon)["'][^>]+href=["']([^"']*)["']/i,
  );
  if (m?.[1]) {
    try {
      return new URL(m[1], baseUrl).href;
    } catch {
      return m[1];
    }
  }
  try {
    return new URL("/favicon.ico", baseUrl).href;
  } catch {
    return "";
  }
}

export async function fetchUrlMeta(url: string): Promise<UrlMeta> {
  const fallback: UrlMeta = {
    title: "",
    description: "",
    image: "",
    favicon: "",
    sourceTag: generateSourceTag(url, ""),
  };
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MarkedBot/1.0; +https://github.com)",
        Accept: "text/html",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fallback;

    const html = (await res.text()).slice(0, 100_000);
    const ogTitle = extractMetaContent(html, "og:title");
    const ogDesc = extractMetaContent(html, "og:description");
    const ogImage = extractMetaContent(html, "og:image");
    const pageTitle = extractTitle(html);
    const title = ogTitle || pageTitle;
    const favicon = extractFavicon(html, url);

    return {
      title,
      description: ogDesc || extractMetaContent(html, "description"),
      image: ogImage,
      favicon,
      sourceTag: generateSourceTag(url, title),
    };
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Payload encoding / decoding for share cards
// ---------------------------------------------------------------------------

export function encodeCollectionPayload(
  collection: MarkedCollection,
  items: MarkedItem[],
): string {
  const payload: MarkedPayload = {
    v: 1,
    c: collection.name,
    items: items.map((i) => ({ t: i.title, u: i.url })),
  };
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

export function decodeCollectionPayload(encoded: string): MarkedPayload | null {
  try {
    const json = Buffer.from(encoded, "base64").toString("utf-8");
    return JSON.parse(json) as MarkedPayload;
  } catch {
    return null;
  }
}
