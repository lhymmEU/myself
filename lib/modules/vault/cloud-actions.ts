/**
 * Cloud-mode vault actions.
 *
 * The server NEVER sees the master key, the password, or any plaintext.
 * It only handles ciphertext + nonce + verification metadata.
 *
 * All key derivation and encryption/decryption happens in the browser.
 * See `lib/modules/vault/client.ts` for the browser-side counterpart.
 *
 * Driver portability: every query goes through `await` against a Drizzle
 * chain. Both better-sqlite3 (sync underneath) and postgres-js (async)
 * support `await db.select()...` via the QueryPromise mixin, so this
 * single shape works in both modes. The sqlite-only `.get()/.all()/.run()`
 * methods do NOT exist on the postgres-js builder and must be avoided.
 */

import { nanoid } from "nanoid";
import { and, desc, eq, sql } from "drizzle-orm";

import { eventBus } from "@/lib/core/event-bus";
import { vaultMeta, vaultSecrets } from "@/lib/db/schema/postgres/vault";
import { getVaultDb } from "./vault-db";
import { VAULT_EVENTS } from "./events";
import type {
  VaultSecretMeta,
  VaultStatus,
  SecretCategory,
} from "./types";

export interface CloudVaultInfo {
  initialized: boolean;
  salt: string | null;
  verificationHash: string | null;
}

export interface CloudCreateSecretInput {
  name: string;
  category?: SecretCategory;
  encryptedValue: string;
  nonce: string;
  encryptedNotes?: string | null;
  notesNonce?: string | null;
  tags?: string[];
}

export interface CloudUpdateSecretInput {
  id: string;
  name?: string;
  category?: SecretCategory;
  encryptedValue?: string;
  nonce?: string;
  encryptedNotes?: string | null;
  notesNonce?: string | null;
  tags?: string[];
}

export interface CloudSecretCipher {
  id: string;
  name: string;
  category: SecretCategory;
  tags: string[];
  encryptedValue: string;
  nonce: string;
  encryptedNotes: string | null;
  notesNonce: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CloudReencryptSecret {
  id: string;
  encryptedValue: string;
  nonce: string;
  encryptedNotes?: string | null;
  notesNonce?: string | null;
}

export async function getCloudVaultInfo(
  userId: string,
): Promise<CloudVaultInfo> {
  const db = getVaultDb();
  const saltRows = await db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .limit(1);
  const hashRows = await db
    .select()
    .from(vaultMeta)
    .where(
      and(
        eq(vaultMeta.userId, userId),
        eq(vaultMeta.key, "verification_hash"),
      ),
    )
    .limit(1);
  const saltRow = saltRows[0];
  const hashRow = hashRows[0];
  return {
    initialized: !!saltRow && !!hashRow,
    salt: saltRow?.value ?? null,
    verificationHash: hashRow?.value ?? null,
  };
}

export async function getCloudVaultStatus(
  userId: string,
): Promise<VaultStatus> {
  const info = await getCloudVaultInfo(userId);
  let secretCount = 0;
  if (info.initialized) {
    const db = getVaultDb();
    const rows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vaultSecrets)
      .where(eq(vaultSecrets.userId, userId));
    secretCount = Number(rows[0]?.count ?? 0);
  }
  return {
    initialized: info.initialized,
    // Cloud mode is always "unlocked" from the server's perspective —
    // the server has no key, only ciphertext. Browser session decides
    // whether to display the data. Returning `true` keeps existing UI
    // gating consistent (the browser-side vault decides what to show).
    unlocked: info.initialized,
    secretCount,
    storagePath: "supabase://vault",
  };
}

export async function setupCloudVault(
  userId: string,
  salt: string,
  verificationHash: string,
): Promise<void> {
  const db = getVaultDb();
  const existing = await db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .limit(1);
  if (existing[0]) throw new Error("Vault is already initialized");

  await db.insert(vaultMeta).values({ userId, key: "salt", value: salt });
  await db
    .insert(vaultMeta)
    .values({ userId, key: "verification_hash", value: verificationHash });
  eventBus.emit("vault", VAULT_EVENTS.VAULT_UNLOCKED, {});
}

type SecretRow = typeof vaultSecrets.$inferSelect;

function rowToCipher(row: SecretRow): CloudSecretCipher {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category as SecretCategory,
    tags,
    encryptedValue: row.encryptedValue,
    nonce: row.nonce,
    encryptedNotes: row.encryptedNotes,
    notesNonce: row.notesNonce,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function rowToMeta(row: SecretRow): VaultSecretMeta {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }
  return {
    id: row.id,
    name: row.name,
    category: row.category as SecretCategory,
    tags,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function listCloudSecretMeta(
  userId: string,
): Promise<VaultSecretMeta[]> {
  const db = getVaultDb();
  const rows = await db
    .select()
    .from(vaultSecrets)
    .where(eq(vaultSecrets.userId, userId))
    .orderBy(desc(vaultSecrets.updatedAt));
  return rows.map(rowToMeta);
}

export async function getCloudSecretCipher(
  id: string,
  userId: string,
): Promise<CloudSecretCipher | null> {
  const db = getVaultDb();
  const rows = await db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return rowToCipher(row);
}

export async function createCloudSecret(
  input: CloudCreateSecretInput,
  userId: string,
): Promise<VaultSecretMeta> {
  const db = getVaultDb();
  const now = Date.now();
  const id = nanoid();

  await db.insert(vaultSecrets).values({
    id,
    userId,
    name: input.name,
    category: input.category ?? "other",
    encryptedValue: input.encryptedValue,
    nonce: input.nonce,
    encryptedNotes: input.encryptedNotes ?? null,
    notesNonce: input.notesNonce ?? null,
    tags: JSON.stringify(input.tags ?? []),
    createdAt: now,
    updatedAt: now,
  });

  eventBus.emit("vault", VAULT_EVENTS.SECRET_CREATED, { id });
  return {
    id,
    name: input.name,
    category: (input.category ?? "other") as SecretCategory,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateCloudSecret(
  input: CloudUpdateSecretInput,
  userId: string,
): Promise<VaultSecretMeta> {
  const db = getVaultDb();
  const existingRows = await db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error(`Secret not found: ${input.id}`);

  const now = Date.now();
  const name = input.name ?? existing.name;
  const category = input.category ?? existing.category;
  const tags =
    input.tags ?? (() => {
      try {
        return JSON.parse(existing.tags);
      } catch {
        return [];
      }
    })();

  await db
    .update(vaultSecrets)
    .set({
      name,
      category,
      encryptedValue: input.encryptedValue ?? existing.encryptedValue,
      nonce: input.nonce ?? existing.nonce,
      encryptedNotes:
        input.encryptedNotes !== undefined
          ? input.encryptedNotes
          : existing.encryptedNotes,
      notesNonce:
        input.notesNonce !== undefined
          ? input.notesNonce
          : existing.notesNonce,
      tags: JSON.stringify(tags),
      updatedAt: now,
    })
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)));

  eventBus.emit("vault", VAULT_EVENTS.SECRET_UPDATED, { id: input.id });
  return {
    id: input.id,
    name,
    category: category as SecretCategory,
    tags,
    createdAt: Number(existing.createdAt),
    updatedAt: now,
  };
}

export async function deleteCloudSecret(
  id: string,
  userId: string,
): Promise<void> {
  const db = getVaultDb();
  await db
    .delete(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)));
  eventBus.emit("vault", VAULT_EVENTS.SECRET_DELETED, { id });
}

/**
 * Replaces the salt + verification hash and re-uploads every secret in the
 * provided batch under the new key (already encrypted client-side).
 *
 * The browser pre-decrypts everything with the old key, re-encrypts under the
 * new key, then ships the entire batch in one request. The server never sees
 * any plaintext.
 */
export async function rotateCloudVault(
  userId: string,
  newSalt: string,
  newVerificationHash: string,
  reencrypted: CloudReencryptSecret[],
): Promise<void> {
  const db = getVaultDb();

  await db
    .update(vaultMeta)
    .set({ value: newSalt })
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")));
  await db
    .update(vaultMeta)
    .set({ value: newVerificationHash })
    .where(
      and(
        eq(vaultMeta.userId, userId),
        eq(vaultMeta.key, "verification_hash"),
      ),
    );

  for (const s of reencrypted) {
    await db
      .update(vaultSecrets)
      .set({
        encryptedValue: s.encryptedValue,
        nonce: s.nonce,
        encryptedNotes: s.encryptedNotes ?? null,
        notesNonce: s.notesNonce ?? null,
        updatedAt: Date.now(),
      })
      .where(and(eq(vaultSecrets.id, s.id), eq(vaultSecrets.userId, userId)));
  }
}
