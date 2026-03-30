import { getDb } from "@/lib/core/db";
import { cronJobs } from "./schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function listCronJobs() {
  const db = getDb();
  return db.select().from(cronJobs).all();
}

export async function getCronJob(id: string) {
  const db = getDb();
  const rows = db.select().from(cronJobs).where(eq(cronJobs.id, id)).all();
  return rows[0] ?? null;
}

export async function createCronJob(data: {
  name: string;
  expression: string;
  command: string;
  sessionId?: string;
  agentId?: string;
  connectionId?: string;
  enabled?: boolean;
}) {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  db.insert(cronJobs)
    .values({
      id,
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
  }>
) {
  const db = getDb();
  db.update(cronJobs)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(cronJobs.id, id))
    .run();
}

export async function deleteCronJob(id: string) {
  const db = getDb();
  db.delete(cronJobs).where(eq(cronJobs.id, id)).run();
}
