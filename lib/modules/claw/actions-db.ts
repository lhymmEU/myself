/**
 * Mode-agnostic CRUD for `claw_connections`. Works in both local (SQLite) and
 * cloud (Postgres) modes via Drizzle.
 */
import { nanoid } from "nanoid";
import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { clawConnections } from "@/lib/db/schema/sqlite/claw";
import type {
  ClawConnection,
  ClawTransportKind,
  CreateConnectionInput,
  UpdateConnectionInput,
} from "./types";

function normaliseTransport(raw: unknown): ClawTransportKind {
  if (raw === "edge" || raw === "relay" || raw === "ssh") return raw;
  return "ssh";
}

const rowToConnection = (
  row: typeof clawConnections.$inferSelect,
): ClawConnection => ({
  id: row.id,
  name: row.name,
  host: row.host,
  port: Number(row.port),
  username: row.username,
  authMethod: row.authMethod as "password" | "key",
  password: row.password ?? undefined,
  privateKey: row.privateKey ?? undefined,
  passphrase: row.passphrase ?? undefined,
  gatewayPort: Number(row.gatewayPort),
  isDefault: Boolean(row.isDefault),
  transport: normaliseTransport(row.transport),
  credentialSecretId: row.credentialSecretId ?? undefined,
  hostKeyFingerprint: row.hostKeyFingerprint ?? undefined,
  createdAt: Number(row.createdAt),
  updatedAt: Number(row.updatedAt),
});

export async function getAllConnections(
  userId: string = LOCAL_USER_ID,
): Promise<ClawConnection[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clawConnections)
    .where(eq(clawConnections.userId, userId))
    .orderBy(desc(clawConnections.isDefault), desc(clawConnections.updatedAt));
  return rows.map(rowToConnection);
}

export async function getConnection(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<ClawConnection | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clawConnections)
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    )
    .limit(1);
  return rows[0] ? rowToConnection(rows[0]) : null;
}

export async function getDefaultConnection(
  userId: string = LOCAL_USER_ID,
): Promise<ClawConnection | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(clawConnections)
    .where(
      and(
        eq(clawConnections.userId, userId),
        eq(clawConnections.isDefault, true),
      ),
    )
    .limit(1);
  if (rows[0]) return rowToConnection(rows[0]);

  const fallback = await db
    .select()
    .from(clawConnections)
    .where(eq(clawConnections.userId, userId))
    .orderBy(desc(clawConnections.updatedAt))
    .limit(1);
  return fallback[0] ? rowToConnection(fallback[0]) : null;
}

export async function createConnection(
  input: CreateConnectionInput,
  userId: string = LOCAL_USER_ID,
): Promise<ClawConnection> {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();

  const existingRows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(clawConnections)
    .where(eq(clawConnections.userId, userId));
  const isDefault = Number(existingRows[0]?.count ?? 0) === 0;

  const transport = normaliseTransport(input.transport);

  await db.insert(clawConnections).values({
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
    gatewayPort: input.gatewayPort ?? 18789,
    isDefault,
    transport,
    credentialSecretId: input.credentialSecretId ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    name: input.name,
    host: input.host,
    port: input.port ?? 22,
    username: input.username,
    authMethod: input.authMethod,
    password: input.password,
    privateKey: input.privateKey,
    passphrase: input.passphrase,
    gatewayPort: input.gatewayPort ?? 18789,
    isDefault,
    transport,
    credentialSecretId: input.credentialSecretId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateConnection(
  input: UpdateConnectionInput,
  userId: string = LOCAL_USER_ID,
): Promise<ClawConnection | null> {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(clawConnections)
    .where(
      and(
        eq(clawConnections.id, input.id),
        eq(clawConnections.userId, userId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
  if (!existing) return null;

  const now = Date.now();
  const patch: Partial<typeof clawConnections.$inferInsert> = {
    updatedAt: now,
  };
  if (input.name !== undefined) patch.name = input.name;
  if (input.host !== undefined) patch.host = input.host;
  if (input.port !== undefined) patch.port = input.port;
  if (input.username !== undefined) patch.username = input.username;
  if (input.authMethod !== undefined) patch.authMethod = input.authMethod;
  if (input.password !== undefined) patch.password = input.password;
  if (input.privateKey !== undefined) patch.privateKey = input.privateKey;
  if (input.passphrase !== undefined) patch.passphrase = input.passphrase;
  if (input.gatewayPort !== undefined) patch.gatewayPort = input.gatewayPort;
  if (input.transport !== undefined) {
    patch.transport = normaliseTransport(input.transport);
  }
  if (input.credentialSecretId !== undefined) {
    patch.credentialSecretId = input.credentialSecretId;
  }
  if (input.hostKeyFingerprint !== undefined) {
    patch.hostKeyFingerprint = input.hostKeyFingerprint;
  }

  await db
    .update(clawConnections)
    .set(patch)
    .where(
      and(
        eq(clawConnections.id, input.id),
        eq(clawConnections.userId, userId),
      ),
    );

  return rowToConnection({
    ...existing,
    ...patch,
    name: patch.name ?? existing.name,
    host: patch.host ?? existing.host,
    port: patch.port ?? existing.port,
    username: patch.username ?? existing.username,
    authMethod: patch.authMethod ?? existing.authMethod,
    password: patch.password ?? existing.password,
    privateKey: patch.privateKey ?? existing.privateKey,
    passphrase: patch.passphrase ?? existing.passphrase,
    gatewayPort: patch.gatewayPort ?? existing.gatewayPort,
    transport: patch.transport ?? existing.transport,
    credentialSecretId:
      patch.credentialSecretId !== undefined
        ? patch.credentialSecretId
        : existing.credentialSecretId,
    hostKeyFingerprint:
      patch.hostKeyFingerprint !== undefined
        ? patch.hostKeyFingerprint
        : existing.hostKeyFingerprint,
  });
}

export async function deleteConnection(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(clawConnections)
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    );
}

export async function setDefaultConnection(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .update(clawConnections)
    .set({ isDefault: false })
    .where(eq(clawConnections.userId, userId));
  await db
    .update(clawConnections)
    .set({ isDefault: true })
    .where(
      and(eq(clawConnections.id, id), eq(clawConnections.userId, userId)),
    );
}
