import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import { goals } from "./schema";
import { GOAL_EVENTS } from "./events";
import type { Goal, CreateGoalInput, UpdateGoalInput, Milestone } from "./types";

function parseRow(row: (typeof goals.$inferSelect)): Goal {
  let milestones: Milestone[] = [];
  try {
    milestones = JSON.parse(row.milestones) as Milestone[];
  } catch {
    milestones = [];
  }
  return {
    id: row.id,
    title: row.title,
    targetDate: row.targetDate,
    progress: Math.min(100, Math.max(0, row.progress)),
    milestones,
    linkedNodeId: row.linkedNodeId ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllGoals(): Goal[] {
  const db = getDb();
  const rows = db.select().from(goals).all();
  return rows.map(parseRow);
}

export function getGoal(id: string): Goal | null {
  const db = getDb();
  const row = db.select().from(goals).where(eq(goals.id, id)).get();
  return row ? parseRow(row) : null;
}

export function createGoal(input: CreateGoalInput): Goal {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const milestones =
    input.milestones !== undefined
      ? JSON.stringify(input.milestones)
      : "[]";
  const row = {
    id,
    title: input.title,
    targetDate: input.targetDate,
    progress: 0,
    milestones,
    linkedNodeId: input.linkedNodeId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(goals).values(row).run();
  const result = parseRow(row as (typeof goals.$inferSelect));
  eventBus.emit("goals", GOAL_EVENTS.GOAL_CREATED, result);
  return result;
}

export function updateGoal(input: UpdateGoalInput): Goal {
  const db = getDb();
  const existing = db
    .select()
    .from(goals)
    .where(eq(goals.id, input.id))
    .get();
  if (!existing) {
    throw new Error(`Goal not found: ${input.id}`);
  }
  const updates: Partial<(typeof goals.$inferInsert)> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.targetDate !== undefined) updates.targetDate = input.targetDate;
  if (input.progress !== undefined)
    updates.progress = Math.min(100, Math.max(0, input.progress));
  if (input.milestones !== undefined)
    updates.milestones = JSON.stringify(input.milestones);
  if (input.linkedNodeId !== undefined)
    updates.linkedNodeId = input.linkedNodeId ?? null;
  db.update(goals).set(updates).where(eq(goals.id, input.id)).run();
  const row = db.select().from(goals).where(eq(goals.id, input.id)).get();
  const result = parseRow(row!);
  eventBus.emit("goals", GOAL_EVENTS.GOAL_UPDATED, result);
  return result;
}

export function deleteGoal(id: string): void {
  const db = getDb();
  const existing = getGoal(id);
  db.delete(goals).where(eq(goals.id, id)).run();
  if (existing) {
    eventBus.emit("goals", GOAL_EVENTS.GOAL_DELETED, { id });
  }
}

export function completeMilestone(goalId: string, milestoneIndex: number): Goal {
  const goal = getGoal(goalId);
  if (!goal) throw new Error(`Goal not found: ${goalId}`);
  if (milestoneIndex < 0 || milestoneIndex >= goal.milestones.length) {
    throw new Error(`Invalid milestone index: ${milestoneIndex}`);
  }
  const milestones = [...goal.milestones];
  milestones[milestoneIndex] = {
    ...milestones[milestoneIndex],
    completed: true,
  };
  const result = updateGoal({ id: goalId, milestones });
  eventBus.emit("goals", GOAL_EVENTS.MILESTONE_COMPLETED, {
    goalId,
    milestoneIndex,
    goal: result,
  });
  return result;
}
