import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { cronJobs } from "./schema";

export async function listCronJobs(userId: string = LOCAL_USER_ID) {
  const db = getDb();
  return db.select().from(cronJobs).where(eq(cronJobs.userId, userId)).all();
}

export async function getCronJob(
  id: string,
  userId: string = LOCAL_USER_ID,
) {
  const db = getDb();
  const rows = db
    .select()
    .from(cronJobs)
    .where(and(eq(cronJobs.id, id), eq(cronJobs.userId, userId)))
    .all();
  return rows[0] ?? null;
}

export async function createCronJob(
  data: {
    name: string;
    expression: string;
    command: string;
    sessionId?: string;
    agentId?: string;
    connectionId?: string;
    enabled?: boolean;
  },
  userId: string = LOCAL_USER_ID,
) {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  db.insert(cronJobs)
    .values({
      id,
      userId,
      name: data.name,
      expression: data.expression,
      command: data.command,
      sessionId: data.sessionId ?? null,
      agentId: data.agentId ?? null,
      connectionId: data.connectionId ?? null,
      enabled: data.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { id };
}

export async function updateCronJob(
  id: string,
  data: Partial<{
    name: string;
    expression: string;
    command: string;
    sessionId: string | null;
    agentId: string | null;
    connectionId: string | null;
    enabled: boolean;
  }>,
  userId: string = LOCAL_USER_ID,
) {
  const db = getDb();
  db.update(cronJobs)
    .set({ ...data, updatedAt: Date.now() })
    .where(and(eq(cronJobs.id, id), eq(cronJobs.userId, userId)))
    .run();
}

export async function deleteCronJob(
  id: string,
  userId: string = LOCAL_USER_ID,
) {
  const db = getDb();
  db.delete(cronJobs)
    .where(and(eq(cronJobs.id, id), eq(cronJobs.userId, userId)))
    .run();
}
