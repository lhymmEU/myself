import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { todos } from "./schema";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "./types";

function rowToTodo(row: (typeof todos.$inferSelect)): Todo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    priority: row.priority as Todo["priority"],
    dueDate: row.dueDate ?? undefined,
    source: row.source as Todo["source"],
    linkedNodeId: row.linkedNodeId ?? undefined,
    llmReasoning: row.llmReasoning ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllTodos(): Todo[] {
  const db = getDb();
  const rows = db.select().from(todos).all();
  return rows.map(rowToTodo);
}

export function getTodo(id: string): Todo | null {
  const db = getDb();
  const row = db.select().from(todos).where(eq(todos.id, id)).get();
  return row ? rowToTodo(row) : null;
}

export function createTodo(input: CreateTodoInput): Todo {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const row = {
    id,
    title: input.title,
    description: input.description ?? null,
    completed: false,
    priority: input.priority ?? "medium",
    dueDate: input.dueDate ?? null,
    source: "manual" as const,
    linkedNodeId: input.linkedNodeId ?? null,
    llmReasoning: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(todos).values(row).run();
  return rowToTodo(row);
}

export function updateTodo(input: UpdateTodoInput): Todo {
  const db = getDb();
  const existing = db.select().from(todos).where(eq(todos.id, input.id)).get();
  if (!existing) {
    throw new Error(`Todo not found: ${input.id}`);
  }
  const updates: Partial<(typeof todos.$inferInsert)> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.completed !== undefined) updates.completed = input.completed;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.dueDate !== undefined) updates.dueDate = input.dueDate;
  if (input.linkedNodeId !== undefined) updates.linkedNodeId = input.linkedNodeId;
  db.update(todos).set(updates).where(eq(todos.id, input.id)).run();
  const updated = db.select().from(todos).where(eq(todos.id, input.id)).get();
  return rowToTodo(updated!);
}

export function deleteTodo(id: string): void {
  const db = getDb();
  db.delete(todos).where(eq(todos.id, id)).run();
}

export function toggleTodo(id: string): Todo {
  const existing = getTodo(id);
  if (!existing) {
    throw new Error(`Todo not found: ${id}`);
  }
  return updateTodo({ id, completed: !existing.completed });
}

const PRIORITY_ORDER: Record<Todo["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function getActiveTodos(): Todo[] {
  const all = getAllTodos();
  return all
    .filter((t) => !t.completed)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}
