import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { lifeNodes } from "./schema";
import type { LifeNode, CreateNodeInput, UpdateNodeInput } from "./types";

function parseRow(row: (typeof lifeNodes.$inferSelect)): LifeNode {
  let connections: string[] = [];
  let metadata: Record<string, unknown> = {};
  try {
    connections = JSON.parse(row.connections) as string[];
  } catch {
    connections = [];
  }
  try {
    metadata = JSON.parse(row.metadata) as Record<string, unknown>;
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    label: row.label,
    type: row.type as "category" | "item",
    parentId: row.parentId,
    color: row.color,
    positionX: row.positionX,
    positionY: row.positionY,
    connections,
    metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getAllNodes(): LifeNode[] {
  const db = getDb();
  const rows = db.select().from(lifeNodes).all();
  return rows.map(parseRow);
}

export function getNode(id: string): LifeNode | null {
  const db = getDb();
  const row = db.select().from(lifeNodes).where(eq(lifeNodes.id, id)).get();
  return row ? parseRow(row) : null;
}

export function createNode(input: CreateNodeInput): LifeNode {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const node = {
    id,
    label: input.label,
    type: input.type,
    parentId: input.parentId ?? null,
    color: input.color ?? "#6366f1",
    positionX: input.positionX ?? 0,
    positionY: input.positionY ?? 0,
    connections: "[]",
    metadata: "{}",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(lifeNodes).values(node).run();
  return parseRow(node as (typeof lifeNodes.$inferSelect));
}

export function updateNode(input: UpdateNodeInput): LifeNode {
  const db = getDb();
  const existing = db
    .select()
    .from(lifeNodes)
    .where(eq(lifeNodes.id, input.id))
    .get();
  if (!existing) {
    throw new Error(`Node not found: ${input.id}`);
  }
  const updates: Partial<(typeof lifeNodes.$inferInsert)> = {
    updatedAt: Date.now(),
  };
  if (input.label !== undefined) updates.label = input.label;
  if (input.type !== undefined) updates.type = input.type;
  if (input.color !== undefined) updates.color = input.color;
  if (input.positionX !== undefined) updates.positionX = input.positionX;
  if (input.positionY !== undefined) updates.positionY = input.positionY;
  if (input.connections !== undefined)
    updates.connections = JSON.stringify(input.connections);
  if (input.metadata !== undefined)
    updates.metadata = JSON.stringify(input.metadata);
  db.update(lifeNodes).set(updates).where(eq(lifeNodes.id, input.id)).run();
  const row = db.select().from(lifeNodes).where(eq(lifeNodes.id, input.id)).get();
  return parseRow(row!);
}

export function deleteNode(id: string): void {
  const db = getDb();
  db.delete(lifeNodes).where(eq(lifeNodes.id, id)).run();
}

export function connectNodes(sourceId: string, targetId: string): LifeNode {
  const node = getNode(sourceId);
  if (!node) throw new Error(`Node not found: ${sourceId}`);
  if (getNode(targetId) === null) throw new Error(`Node not found: ${targetId}`);
  if (node.connections.includes(targetId)) return node;
  const connections = [...node.connections, targetId];
  return updateNode({ id: sourceId, connections });
}

export function disconnectNodes(sourceId: string, targetId: string): LifeNode {
  const node = getNode(sourceId);
  if (!node) throw new Error(`Node not found: ${sourceId}`);
  const connections = node.connections.filter((c) => c !== targetId);
  return updateNode({ id: sourceId, connections });
}
