import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import { planPages } from "./schema";
import { PLAN_EVENTS } from "./events";
import type { PlanPage, CreatePlanInput, UpdatePlanInput } from "./types";

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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllPlans(): PlanPage[] {
  const db = getDb();
  const rows = db.select().from(planPages).all();
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
  const row = {
    id,
    title: input.title,
    content,
    linkedNodeId: input.linkedNodeId ?? null,
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
