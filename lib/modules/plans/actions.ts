import { nanoid } from "nanoid";
import { eq, asc, sql } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import { planPages, planFolders } from "./schema";
import { PLAN_EVENTS } from "./events";
import type { PlanPage, PlanFolder, CreatePlanInput, UpdatePlanInput } from "./types";

function parseRow(row: (typeof planPages.$inferSelect)): PlanPage {
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

export function getAllPlans(): PlanPage[] {
  const db = getDb();
  const rows = db.select().from(planPages).orderBy(asc(planPages.sortOrder)).all();
  return rows.map(parseRow);
}

export function getPlan(id: string): PlanPage | null {
  const db = getDb();
  const row = db.select().from(planPages).where(eq(planPages.id, id)).get();
  return row ? parseRow(row) : null;
}

export function createPlan(input: CreatePlanInput): PlanPage {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const content = input.content !== undefined ? JSON.stringify(input.content) : "{}";
  const maxRow = db
    .select({ max: sql<number>`COALESCE(MAX(${planPages.sortOrder}), -1)` })
    .from(planPages)
    .get();
  const sortOrder = (maxRow?.max ?? -1) + 1;
  const row = {
    id,
    title: input.title,
    content,
    linkedNodeId: input.linkedNodeId ?? null,
    folderId: input.folderId ?? null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(planPages).values(row).run();
  const result = parseRow(row as (typeof planPages.$inferSelect));
  eventBus.emit("plans", PLAN_EVENTS.PLAN_CREATED, result);
  return result;
}

export function updatePlan(input: UpdatePlanInput): PlanPage {
  const db = getDb();
  const existing = db
    .select()
    .from(planPages)
    .where(eq(planPages.id, input.id))
    .get();
  if (!existing) {
    throw new Error(`Plan not found: ${input.id}`);
  }
  const updates: Partial<(typeof planPages.$inferInsert)> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.content !== undefined) updates.content = JSON.stringify(input.content);
  if (input.linkedNodeId !== undefined) updates.linkedNodeId = input.linkedNodeId ?? null;
  if (input.folderId !== undefined) updates.folderId = input.folderId ?? null;
  db.update(planPages).set(updates).where(eq(planPages.id, input.id)).run();
  const row = db.select().from(planPages).where(eq(planPages.id, input.id)).get();
  const result = parseRow(row!);
  eventBus.emit("plans", PLAN_EVENTS.PLAN_UPDATED, result);
  return result;
}

export function deletePlan(id: string): void {
  const db = getDb();
  const existing = getPlan(id);
  db.delete(planPages).where(eq(planPages.id, id)).run();
  if (existing) {
    eventBus.emit("plans", PLAN_EVENTS.PLAN_DELETED, { id });
  }
}

export function reorderPlans(ids: string[]): void {
  const db = getDb();
  ids.forEach((id, index) => {
    db.update(planPages)
      .set({ sortOrder: index })
      .where(eq(planPages.id, id))
      .run();
  });
}

// --- Plan Folders ---

export function listFolders(): PlanFolder[] {
  const db = getDb();
  return db.select().from(planFolders).orderBy(asc(planFolders.sortOrder)).all();
}

export function createFolder(name: string): PlanFolder {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const maxRow = db
    .select({ max: sql<number>`COALESCE(MAX(${planFolders.sortOrder}), -1)` })
    .from(planFolders)
    .get();
  const sortOrder = (maxRow?.max ?? -1) + 1;
  const row = { id, name, sortOrder, createdAt: now, updatedAt: now };
  db.insert(planFolders).values(row).run();
  return row;
}

export function renameFolder(id: string, name: string): void {
  const db = getDb();
  db.update(planFolders)
    .set({ name, updatedAt: Date.now() })
    .where(eq(planFolders.id, id))
    .run();
}

export function deleteFolder(id: string): void {
  const db = getDb();
  db.update(planPages)
    .set({ folderId: null })
    .where(eq(planPages.folderId, id))
    .run();
  db.delete(planFolders).where(eq(planFolders.id, id)).run();
}

export function reorderFolders(ids: string[]): void {
  const db = getDb();
  ids.forEach((id, index) => {
    db.update(planFolders)
      .set({ sortOrder: index })
      .where(eq(planFolders.id, id))
      .run();
  });
}
