import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
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
    positionX: Number(row.positionX),
    positionY: Number(row.positionY),
    connections,
    metadata,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getAllNodes(
  userId: string,
): Promise<LifeNode[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lifeNodes)
    .where(eq(lifeNodes.userId, userId));
  return rows.map(parseRow);
}

export async function getNode(
  id: string,
  userId: string,
): Promise<LifeNode | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, id), eq(lifeNodes.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseRow(row) : null;
}

export async function createNode(
  input: CreateNodeInput,
  userId: string,
): Promise<LifeNode> {
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
  await db.insert(lifeNodes).values(node);
  return parseRow(node as typeof lifeNodes.$inferSelect);
}

export async function updateNode(
  input: UpdateNodeInput,
  userId: string,
): Promise<LifeNode> {
  const db = getDb();
  const existing = await db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)))
    .limit(1);
  if (!existing[0]) {
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
  await db
    .update(lifeNodes)
    .set(updates)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)));
  const rows = await db
    .select()
    .from(lifeNodes)
    .where(and(eq(lifeNodes.id, input.id), eq(lifeNodes.userId, userId)))
    .limit(1);
  return parseRow(rows[0]!);
}

export async function deleteNode(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(lifeNodes)
    .where(and(eq(lifeNodes.id, id), eq(lifeNodes.userId, userId)));
}

export async function connectNodes(
  sourceId: string,
  targetId: string,
  userId: string,
): Promise<LifeNode> {
  const node = await getNode(sourceId, userId);
  if (!node) throw new Error(`Node not found: ${sourceId}`);
  if ((await getNode(targetId, userId)) === null)
    throw new Error(`Node not found: ${targetId}`);
  if (node.connections.includes(targetId)) return node;
  const connections = [...node.connections, targetId];
  return updateNode({ id: sourceId, connections }, userId);
}

export async function disconnectNodes(
  sourceId: string,
  targetId: string,
  userId: string,
): Promise<LifeNode> {
  const node = await getNode(sourceId, userId);
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
    isTodoSource: Number(row.isTodoSource) === 1,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getScene(
  id: string,
  userId: string,
): Promise<MindMapScene | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseSceneRow(row) : null;
}

export async function getOrCreateDefaultScene(
  userId: string,
): Promise<MindMapScene> {
  const existing = await getScene(DEFAULT_SCENE_ID, userId);
  if (existing) return existing;
  return createScene({ name: "Mind Map" }, userId, DEFAULT_SCENE_ID);
}

export async function getAllScenes(
  userId: string,
  mode?: "mind" | "product",
): Promise<MindMapScene[]> {
  const db = getDb();
  if (mode) {
    const rows = await db
      .select()
      .from(mindMapScenes)
      .where(
        and(eq(mindMapScenes.userId, userId), eq(mindMapScenes.mode, mode)),
      );
    return rows.map(parseSceneRow);
  }
  const rows = await db
    .select()
    .from(mindMapScenes)
    .where(eq(mindMapScenes.userId, userId));
  return rows.map(parseSceneRow);
}

export async function createScene(
  input: CreateSceneInput,
  userId: string,
  id?: string,
): Promise<MindMapScene> {
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
  await db.insert(mindMapScenes).values(scene);
  return parseSceneRow(scene as typeof mindMapScenes.$inferSelect);
}

export async function updateScene(
  input: UpdateSceneInput,
  userId: string,
): Promise<MindMapScene> {
  const db = getDb();
  const existing = await db
    .select()
    .from(mindMapScenes)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    )
    .limit(1);
  if (!existing[0]) {
    throw new Error(`Scene not found: ${input.id}`);
  }
  const updates: Partial<typeof mindMapScenes.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.elements !== undefined) updates.elements = input.elements;
  if (input.appState !== undefined) updates.appState = input.appState;
  if (input.files !== undefined) updates.files = input.files;
  await db
    .update(mindMapScenes)
    .set(updates)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    );
  const rows = await db
    .select()
    .from(mindMapScenes)
    .where(
      and(eq(mindMapScenes.id, input.id), eq(mindMapScenes.userId, userId)),
    )
    .limit(1);
  return parseSceneRow(rows[0]!);
}

export async function deleteScene(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)));
}

export async function getTodoSourceScene(
  userId: string,
): Promise<MindMapScene | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(mindMapScenes)
    .where(
      and(
        eq(mindMapScenes.userId, userId),
        eq(mindMapScenes.isTodoSource, 1),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? parseSceneRow(row) : null;
}

export async function setTodoSource(
  id: string,
  enabled: boolean,
  userId: string,
): Promise<MindMapScene> {
  const db = getDb();
  if (enabled) {
    await db
      .update(mindMapScenes)
      .set({ isTodoSource: 0 })
      .where(
        and(
          eq(mindMapScenes.userId, userId),
          eq(mindMapScenes.isTodoSource, 1),
        ),
      );
  }
  await db
    .update(mindMapScenes)
    .set({ isTodoSource: enabled ? 1 : 0 })
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)));
  const rows = await db
    .select()
    .from(mindMapScenes)
    .where(and(eq(mindMapScenes.id, id), eq(mindMapScenes.userId, userId)))
    .limit(1);
  return parseSceneRow(rows[0]!);
}
