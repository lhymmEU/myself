import { nanoid } from "nanoid";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/core/event-bus";
import { planPages, planFolders } from "./schema";
import { PLAN_EVENTS } from "./events";
import { deleteAttachmentsForPlan } from "./attachments";
import type {
  PlanPage,
  PlanFolder,
  CreatePlanInput,
  UpdatePlanInput,
} from "./types";

function parseRow(row: typeof planPages.$inferSelect): PlanPage {
  let content: unknown = {};
  try {
    content = JSON.parse(row.content) as unknown;
  } catch {
    content = {};
  }
  return {
    id: row.id,
    title: row.title,
    content,
    linkedNodeId: row.linkedNodeId ?? undefined,
    folderId: row.folderId ?? null,
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function parseFolderRow(row: typeof planFolders.$inferSelect): PlanFolder {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

// --- Plan Pages ---

export async function getAllPlans(
  userId: string,
): Promise<PlanPage[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(planPages)
    .where(eq(planPages.userId, userId))
    .orderBy(asc(planPages.sortOrder));
  return rows.map(parseRow);
}

export async function getPlan(
  id: string,
  userId: string,
): Promise<PlanPage | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, id), eq(planPages.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseRow(row) : null;
}

/**
 * Idempotency hook for "auto-create plan from mind-map todo". Returns the
 * single plan whose linked_node_id matches the given mind-map element id, if
 * any.
 */
export async function getPlanByLinkedNode(
  linkedNodeId: string,
  userId: string,
): Promise<PlanPage | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(planPages)
    .where(
      and(
        eq(planPages.linkedNodeId, linkedNodeId),
        eq(planPages.userId, userId),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? parseRow(row) : null;
}

/**
 * Bulk version used by the Todos UI badge — returns a map keyed by
 * `linkedNodeId` so consumers can look up "does this todo have a plan?" in
 * O(1).
 */
export async function getPlansByLinkedNodes(
  ids: string[],
  userId: string,
): Promise<Record<string, PlanPage>> {
  if (ids.length === 0) return {};
  const db = getDb();
  const rows = await db
    .select()
    .from(planPages)
    .where(
      and(eq(planPages.userId, userId), inArray(planPages.linkedNodeId, ids)),
    );
  const byNode: Record<string, PlanPage> = {};
  for (const row of rows) {
    if (row.linkedNodeId) byNode[row.linkedNodeId] = parseRow(row);
  }
  return byNode;
}

export async function createPlan(
  input: CreatePlanInput,
  userId: string,
): Promise<PlanPage> {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const content =
    input.content !== undefined ? JSON.stringify(input.content) : "{}";
  const maxRows = await db
    .select({
      max: sql<number>`COALESCE(MAX(${planPages.sortOrder}), -1)`,
    })
    .from(planPages)
    .where(eq(planPages.userId, userId));
  const sortOrder = Number(maxRows[0]?.max ?? -1) + 1;
  const row = {
    id,
    userId,
    title: input.title,
    content,
    linkedNodeId: input.linkedNodeId ?? null,
    folderId: input.folderId ?? null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(planPages).values(row);
  const result = parseRow(row as typeof planPages.$inferSelect);
  eventBus.emit("plans", PLAN_EVENTS.PLAN_CREATED, result);
  return result;
}

export async function updatePlan(
  input: UpdatePlanInput,
  userId: string,
): Promise<PlanPage> {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)))
    .limit(1);
  if (!existingRows[0]) {
    throw new Error(`Plan not found: ${input.id}`);
  }
  const updates: Partial<typeof planPages.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined)
    updates.content = JSON.stringify(input.content);
  if (input.linkedNodeId !== undefined)
    updates.linkedNodeId = input.linkedNodeId ?? null;
  if (input.folderId !== undefined) updates.folderId = input.folderId ?? null;
  await db
    .update(planPages)
    .set(updates)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)));
  const rows = await db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)))
    .limit(1);
  const result = parseRow(rows[0]!);
  eventBus.emit("plans", PLAN_EVENTS.PLAN_UPDATED, result);
  return result;
}

export async function deletePlan(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  const existing = await getPlan(id, userId);
  await deleteAttachmentsForPlan(id, userId);
  await db
    .delete(planPages)
    .where(and(eq(planPages.id, id), eq(planPages.userId, userId)));
  if (existing) {
    eventBus.emit("plans", PLAN_EVENTS.PLAN_DELETED, { id });
  }
}

export async function reorderPlans(
  ids: string[],
  userId: string,
): Promise<void> {
  const db = getDb();
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(planPages)
      .set({ sortOrder: index })
      .where(and(eq(planPages.id, id), eq(planPages.userId, userId)));
  }
}

// --- Plan Folders ---

export async function listFolders(
  userId: string,
): Promise<PlanFolder[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(planFolders)
    .where(eq(planFolders.userId, userId))
    .orderBy(asc(planFolders.sortOrder));
  return rows.map(parseFolderRow);
}

export async function createFolder(
  name: string,
  userId: string,
): Promise<PlanFolder> {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const maxRows = await db
    .select({
      max: sql<number>`COALESCE(MAX(${planFolders.sortOrder}), -1)`,
    })
    .from(planFolders)
    .where(eq(planFolders.userId, userId));
  const sortOrder = Number(maxRows[0]?.max ?? -1) + 1;
  const row = {
    id,
    userId,
    name,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(planFolders).values(row);
  return parseFolderRow(row as typeof planFolders.$inferSelect);
}

export async function renameFolder(
  id: string,
  name: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(planFolders)
    .set({ name, updatedAt: Date.now() })
    .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)));
}

export async function deleteFolder(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(planPages)
    .set({ folderId: null })
    .where(and(eq(planPages.folderId, id), eq(planPages.userId, userId)));
  await db
    .delete(planFolders)
    .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)));
}

export async function reorderFolders(
  ids: string[],
  userId: string,
): Promise<void> {
  const db = getDb();
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(planFolders)
      .set({ sortOrder: index })
      .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)));
  }
}
