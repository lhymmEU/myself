import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import { habits } from "./schema";
import { HABIT_EVENTS } from "./events";
import type { Habit, CreateHabitInput } from "./types";

function parseRow(row: (typeof habits.$inferSelect)): Habit {
  let completions: string[] = [];
  try {
    completions = JSON.parse(row.completions) as string[];
  } catch {
    completions = [];
  }
  return {
    id: row.id,
    name: row.name,
    frequency: row.frequency as "daily" | "weekly",
    completions,
    linkedNodeId: row.linkedNodeId ?? undefined,
    createdAt: row.createdAt,
  };
}

function getIsoWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

function calculateStreak(completions: string[], frequency: "daily" | "weekly"): number {
  if (completions.length === 0) return 0;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisWeek = getIsoWeek(today);

  if (frequency === "daily") {
    const set = new Set(completions);
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 365; i++) {
      const d = checkDate.toISOString().slice(0, 10);
      if (set.has(d)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  const weekSet = new Set(completions.map(getIsoWeek));
  let streak = 0;
  let checkDate = new Date(now);
  for (let i = 0; i < 52; i++) {
    const d = checkDate.toISOString().slice(0, 10);
    const w = getIsoWeek(d);
    if (weekSet.has(w)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

export function getAllHabits(): Habit[] {
  const db = getDb();
  const rows = db.select().from(habits).all();
  return rows.map(parseRow);
}

export function createHabit(input: CreateHabitInput): Habit {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const row = {
    id,
    name: input.name,
    frequency: input.frequency ?? "daily",
    completions: "[]",
    linkedNodeId: input.linkedNodeId ?? null,
    createdAt: now,
  };
  db.insert(habits).values(row).run();
  const result = parseRow(row as (typeof habits.$inferSelect));
  eventBus.emit("habits", HABIT_EVENTS.HABIT_CREATED, result);
  return result;
}

export function deleteHabit(id: string): void {
  const db = getDb();
  const existing = getHabit(id);
  db.delete(habits).where(eq(habits.id, id)).run();
  if (existing) {
    eventBus.emit("habits", HABIT_EVENTS.HABIT_DELETED, { id });
  }
}

export function getHabit(id: string): Habit | null {
  const db = getDb();
  const row = db.select().from(habits).where(eq(habits.id, id)).get();
  return row ? parseRow(row) : null;
}

export function logCompletion(id: string, date: string): Habit {
  const habit = getHabit(id);
  if (!habit) throw new Error(`Habit not found: ${id}`);
  const completions = [...habit.completions];
  if (!completions.includes(date)) {
    completions.push(date);
    completions.sort();
  }
  const db = getDb();
  db.update(habits)
    .set({ completions: JSON.stringify(completions) })
    .where(eq(habits.id, id))
    .run();
  const row = db.select().from(habits).where(eq(habits.id, id)).get();
  const result = parseRow(row!);
  eventBus.emit("habits", HABIT_EVENTS.HABIT_COMPLETED, {
    habitId: id,
    date,
    habit: result,
  });
  return result;
}

export function getHabitStreaks(): Array< { habit: Habit; streak: number }> {
  const allHabits = getAllHabits();
  return allHabits.map((habit) => ({
    habit,
    streak: calculateStreak(habit.completions, habit.frequency),
  }));
}
