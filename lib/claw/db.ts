import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { clawConnections } from "@/lib/db/schema/postgres/claw";

export type ClawAuthMethod = "password" | "key";

export interface ClawConnection {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: ClawAuthMethod;
  password: string | null;
  privateKey: string | null;
  passphrase: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateClawConnectionInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  authMethod: ClawAuthMethod;
  password?: string | null;
  privateKey?: string | null;
  passphrase?: string | null;
  isDefault?: boolean;
}

export type UpdateClawConnectionInput = Partial<CreateClawConnectionInput>;

function normalize(row: typeof clawConnections.$inferSelect): ClawConnection {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    host: row.host,
    port: Number(row.port),
    username: row.username,
    authMethod: row.authMethod as ClawAuthMethod,
    password: row.password ?? null,
    privateKey: row.privateKey ?? null,
    passphrase: row.passphrase ?? null,
    isDefault: Boolean(row.isDefault),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function listClawConnections(
  userId: string,
): Promise<ClawConnection[]> {
  const rows = await getDb()
    .select()
    .from(clawConnections)
    .where(eq(clawConnections.userId, userId));
  return rows.map(normalize);
}

export async function getClawConnection(
  id: string,
  userId: string,
): Promise<ClawConnection | null> {
  const rows = await getDb()
    .select()
    .from(clawConnections)
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    )
    .limit(1);
  return rows[0] ? normalize(rows[0]) : null;
}

export async function getDefaultClawConnection(
  userId: string,
): Promise<ClawConnection | null> {
  const all = await listClawConnections(userId);
  if (all.length === 0) return null;
  return all.find((c) => c.isDefault) ?? all[0];
}

async function clearDefault(userId: string) {
  await getDb()
    .update(clawConnections)
    .set({ isDefault: false, updatedAt: Date.now() })
    .where(eq(clawConnections.userId, userId));
}

export async function createClawConnection(
  input: CreateClawConnectionInput,
  userId: string,
): Promise<ClawConnection> {
  const now = Date.now();
  const id = nanoid();
  const existing = await listClawConnections(userId);
  const shouldBeDefault = existing.length === 0 ? true : Boolean(input.isDefault);
  if (shouldBeDefault) {
    await clearDefault(userId);
  }
  await getDb().insert(clawConnections).values({
    id,
    userId,
    name: input.name,
    host: input.host,
    port: input.port ?? 22,
    username: input.username,
    authMethod: input.authMethod,
    password: input.password ?? null,
    privateKey: input.privateKey ?? null,
    passphrase: input.passphrase ?? null,
    isDefault: shouldBeDefault,
    createdAt: now,
    updatedAt: now,
  });
  const created = await getClawConnection(id, userId);
  if (!created) throw new Error("Failed to insert connection");
  return created;
}

export async function updateClawConnection(
  id: string,
  patch: UpdateClawConnectionInput,
  userId: string,
): Promise<ClawConnection | null> {
  if (patch.isDefault) {
    await clearDefault(userId);
  }
  const updates: Partial<typeof clawConnections.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.host !== undefined) updates.host = patch.host;
  if (patch.port !== undefined) updates.port = patch.port;
  if (patch.username !== undefined) updates.username = patch.username;
  if (patch.authMethod !== undefined) updates.authMethod = patch.authMethod;
  if (patch.password !== undefined) updates.password = patch.password;
  if (patch.privateKey !== undefined) updates.privateKey = patch.privateKey;
  if (patch.passphrase !== undefined) updates.passphrase = patch.passphrase;
  if (patch.isDefault !== undefined) updates.isDefault = patch.isDefault;
  await getDb()
    .update(clawConnections)
    .set(updates)
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    );
  return getClawConnection(id, userId);
}

export async function deleteClawConnection(
  id: string,
  userId: string,
): Promise<void> {
  await getDb()
    .delete(clawConnections)
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    );
}
