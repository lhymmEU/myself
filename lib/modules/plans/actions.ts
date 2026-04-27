import { nanoid } from "nanoid";
import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { eventBus } from "@/lib/core/event-bus";
import { planPages, planFolders } from "./schema";
import { PLAN_EVENTS } from "./events";
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
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// --- Plan Pages ---

export function getAllPlans(userId: string = LOCAL_USER_ID): PlanPage[] {
  const db = getDb();
  const rows = db
    .select()
    .from(planPages)
    .where(eq(planPages.userId, userId))
    .orderBy(asc(planPages.sortOrder))
    .all();
  return rows.map(parseRow);
}

export function getPlan(
  id: string,
  userId: string = LOCAL_USER_ID,
): PlanPage | null {
  const db = getDb();
  const row = db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, id), eq(planPages.userId, userId)))
    .get();
  return row ? parseRow(row) : null;
}

export function createPlan(
  input: CreatePlanInput,
  userId: string = LOCAL_USER_ID,
): PlanPage {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const content =
    input.content !== undefined ? JSON.stringify(input.content) : "{}";
  const maxRow = db
    .select({
      max: sql<number>`COALESCE(MAX(${planPages.sortOrder}), -1)`,
    })
    .from(planPages)
    .where(eq(planPages.userId, userId))
    .get();
  const sortOrder = (maxRow?.max ?? -1) + 1;
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
  db.insert(planPages).values(row).run();
  const result = parseRow(row as typeof planPages.$inferSelect);
  eventBus.emit("plans", PLAN_EVENTS.PLAN_CREATED, result);
  return result;
}

export function updatePlan(
  input: UpdatePlanInput,
  userId: string = LOCAL_USER_ID,
): PlanPage {
  const db = getDb();
  const existing = db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)))
    .get();
  if (!existing) {
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
  db.update(planPages)
    .set(updates)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)))
    .run();
  const row = db
    .select()
    .from(planPages)
    .where(and(eq(planPages.id, input.id), eq(planPages.userId, userId)))
    .get();
  const result = parseRow(row!);
  eventBus.emit("plans", PLAN_EVENTS.PLAN_UPDATED, result);
  return result;
}

export function deletePlan(id: string, userId: string = LOCAL_USER_ID): void {
  const db = getDb();
  const existing = getPlan(id, userId);
  db.delete(planPages)
    .where(and(eq(planPages.id, id), eq(planPages.userId, userId)))
    .run();
  if (existing) {
    eventBus.emit("plans", PLAN_EVENTS.PLAN_DELETED, { id });
  }
}

export function reorderPlans(
  ids: string[],
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  ids.forEach((id, index) => {
    db.update(planPages)
      .set({ sortOrder: index })
      .where(and(eq(planPages.id, id), eq(planPages.userId, userId)))
      .run();
  });
}

// --- Plan Folders ---

export function listFolders(userId: string = LOCAL_USER_ID): PlanFolder[] {
  const db = getDb();
  return db
    .select()
    .from(planFolders)
    .where(eq(planFolders.userId, userId))
    .orderBy(asc(planFolders.sortOrder))
    .all();
}

export function createFolder(
  name: string,
  userId: string = LOCAL_USER_ID,
): PlanFolder {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const maxRow = db
    .select({
      max: sql<number>`COALESCE(MAX(${planFolders.sortOrder}), -1)`,
    })
    .from(planFolders)
    .where(eq(planFolders.userId, userId))
    .get();
  const sortOrder = (maxRow?.max ?? -1) + 1;
  const row = {
    id,
    userId,
    name,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(planFolders).values(row).run();
  return row;
}

export function renameFolder(
  id: string,
  name: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.update(planFolders)
    .set({ name, updatedAt: Date.now() })
    .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)))
    .run();
}

export function deleteFolder(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.update(planPages)
    .set({ folderId: null })
    .where(and(eq(planPages.folderId, id), eq(planPages.userId, userId)))
    .run();
  db.delete(planFolders)
    .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)))
    .run();
}

export function reorderFolders(
  ids: string[],
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  ids.forEach((id, index) => {
    db.update(planFolders)
      .set({ sortOrder: index })
      .where(and(eq(planFolders.id, id), eq(planFolders.userId, userId)))
      .run();
  });
}
