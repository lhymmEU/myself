import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { lifeNodes, mindMapScenes } from "./schema";
import type {
  LifeNode,
  CreateNodeInput,
  UpdateNodeInput,
  MindMapScene,
  CreateSceneInput,
  UpdateSceneInput,
} from "./types";

function parseRow(row: typeof lifeNodes.$inferSelect): LifeNode {
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

export function getAllNodes(userId: string = LOCAL_USER_ID): LifeNode[] {
  const db = getDb();
  const rows = db
    .select()
    .from(lifeNodes)
    .where(eq(lifeNodes.userId, userId))
    .all();
  return rows.map(parseRow);
}

export function getNode(
  id: string,
  userId: string = LOCAL_USER_ID,
): LifeNode | null {
  const db = getDb();
  const row = db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, id), eq(lifeNodes.userId, userId)))
    .get();
  return row ? parseRow(row) : null;
}

export function createNode(
  input: CreateNodeInput,
  userId: string = LOCAL_USER_ID,
): LifeNode {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  const node = {
    id,
    userId,
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
  return parseRow(node as typeof lifeNodes.$inferSelect);
}

export function updateNode(
  input: UpdateNodeInput,
  userId: string = LOCAL_USER_ID,
): LifeNode {
  const db = getDb();
  const existing = db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)))
    .get();
  if (!existing) {
    throw new Error(`Node not found: ${input.id}`);
  }
  const updates: Partial<typeof lifeNodes.$inferInsert> = {
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
  db.update(lifeNodes)
    .set(updates)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)))
    .run();
  const row = db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)))
    .get();
  return parseRow(row!);
}

export function deleteNode(id: string, userId: string = LOCAL_USER_ID): void {
  const db = getDb();
  db.delete(lifeNodes)
    .where(and(eq(lifeNodes.id, id), eq(lifeNodes.userId, userId)))
    .run();
}

export function connectNodes(
  sourceId: string,
  targetId: string,
  userId: string = LOCAL_USER_ID,
): LifeNode {
  const node = getNode(sourceId, userId);
  if (!node) throw new Error(`Node not found: ${sourceId}`);
  if (getNode(targetId, userId) === null)
    throw new Error(`Node not found: ${targetId}`);
  if (node.connections.includes(targetId)) return node;
  const connections = [...node.connections, targetId];
  return updateNode({ id: sourceId, connections }, userId);
}

export function disconnectNodes(
  sourceId: string,
  targetId: string,
  userId: string = LOCAL_USER_ID,
): LifeNode {
  const node = getNode(sourceId, userId);
  if (!node) throw new Error(`Node not found: ${sourceId}`);
  const connections = node.connections.filter((c) => c !== targetId);
  return updateNode({ id: sourceId, connections }, userId);
}

// --- Scene CRUD ---

const DEFAULT_SCENE_ID = "default";

function parseSceneRow(
  row: typeof mindMapScenes.$inferSelect,
): MindMapScene {
  return {
    id: row.id,
    name: row.name,
    elements: row.elements,
    appState: row.appState,
    files: row.files,
    mode: (row.mode as "mind" | "product") ?? "mind",
    isTodoSource: row.isTodoSource === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function getScene(
  id: string,
  userId: string = LOCAL_USER_ID,
): MindMapScene | null {
  const db = getDb();
  const row = db
    .select()
    .from(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .get();
  return row ? parseSceneRow(row) : null;
}

export function getOrCreateDefaultScene(
  userId: string = LOCAL_USER_ID,
): MindMapScene {
  const existing = getScene(DEFAULT_SCENE_ID, userId);
  if (existing) return existing;
  return createScene({ name: "Mind Map" }, DEFAULT_SCENE_ID, userId);
}

export function getAllScenes(
  mode?: "mind" | "product",
  userId: string = LOCAL_USER_ID,
): MindMapScene[] {
  const db = getDb();
  if (mode) {
    const rows = db
      .select()
      .from(mindMapScenes)
      .where(
        and(
          eq(mindMapScenes.userId, userId),
          eq(mindMapScenes.mode, mode),
        ),
      )
      .all();
    return rows.map(parseSceneRow);
  }
  const rows = db
    .select()
    .from(mindMapScenes)
    .where(eq(mindMapScenes.userId, userId))
    .all();
  return rows.map(parseSceneRow);
}

export function createScene(
  input: CreateSceneInput,
  id?: string,
  userId: string = LOCAL_USER_ID,
): MindMapScene {
  const db = getDb();
  const now = Date.now();
  const sceneId = id ?? nanoid();
  const scene = {
    id: sceneId,
    userId,
    name: input.name ?? "Untitled",
    elements: input.elements ?? "[]",
    appState: input.appState ?? "{}",
    files: input.files ?? "{}",
    mode: input.mode ?? "mind",
    isTodoSource: 0,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(mindMapScenes).values(scene).run();
  return parseSceneRow(scene as typeof mindMapScenes.$inferSelect);
}

export function updateScene(
  input: UpdateSceneInput,
  userId: string = LOCAL_USER_ID,
): MindMapScene {
  const db = getDb();
  const existing = db
    .select()
    .from(mindMapScenes)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    )
    .get();
  if (!existing) {
    throw new Error(`Scene not found: ${input.id}`);
  }
  const updates: Partial<typeof mindMapScenes.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.elements !== undefined) updates.elements = input.elements;
  if (input.appState !== undefined) updates.appState = input.appState;
  if (input.files !== undefined) updates.files = input.files;
  db.update(mindMapScenes)
    .set(updates)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    )
    .run();
  const row = db
    .select()
    .from(mindMapScenes)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    )
    .get();
  return parseSceneRow(row!);
}

export function deleteScene(id: string, userId: string = LOCAL_USER_ID): void {
  const db = getDb();
  db.delete(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .run();
}

export function getTodoSourceScene(
  userId: string = LOCAL_USER_ID,
): MindMapScene | null {
  const db = getDb();
  const row = db
    .select()
    .from(mindMapScenes)
    .where(
      and(
        eq(mindMapScenes.userId, userId),
        eq(mindMapScenes.isTodoSource, 1),
      ),
    )
    .get();
  return row ? parseSceneRow(row) : null;
}

export function setTodoSource(
  id: string,
  enabled: boolean,
  userId: string = LOCAL_USER_ID,
): MindMapScene {
  const db = getDb();
  if (enabled) {
    db.update(mindMapScenes)
      .set({ isTodoSource: 0 })
      .where(
        and(
          eq(mindMapScenes.userId, userId),
          eq(mindMapScenes.isTodoSource, 1),
        ),
      )
      .run();
  }
  db.update(mindMapScenes)
    .set({ isTodoSource: enabled ? 1 : 0 })
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .run();
  const row = db
    .select()
    .from(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .get();
  return parseSceneRow(row!);
}
