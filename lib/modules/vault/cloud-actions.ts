/**
 * Cloud-mode vault actions.
 *
 * The server NEVER sees the master key, the password, or any plaintext.
 * It only handles ciphertext + nonce + verification metadata.
 *
 * All key derivation and encryption/decryption happens in the browser.
 * See `lib/modules/vault/client.ts` for the browser-side counterpart.
 */

import { nanoid } from "nanoid";
import { and, desc, eq, sql } from "drizzle-orm";

import { eventBus } from "@/lib/core/event-bus";
import { vaultMeta, vaultSecrets } from "@/lib/db/schema/sqlite/vault";
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

export function getCloudVaultInfo(userId: string): CloudVaultInfo {
  const db = getVaultDb();
  const saltRow = db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .get();
  const hashRow = db
    .select()
    .from(vaultMeta)
    .where(
      and(
        eq(vaultMeta.userId, userId),
        eq(vaultMeta.key, "verification_hash"),
      ),
    )
    .get();
  return {
    initialized: !!saltRow && !!hashRow,
    salt: saltRow?.value ?? null,
    verificationHash: hashRow?.value ?? null,
  };
}

export function getCloudVaultStatus(userId: string): VaultStatus {
  const info = getCloudVaultInfo(userId);
  let secretCount = 0;
  if (info.initialized) {
    const db = getVaultDb();
    const row = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vaultSecrets)
      .where(eq(vaultSecrets.userId, userId))
      .get();
    secretCount = Number(row?.count ?? 0);
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

export function setupCloudVault(
  userId: string,
  salt: string,
  verificationHash: string,
): void {
  const db = getVaultDb();
  const existing = db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .get();
  if (existing) throw new Error("Vault is already initialized");

  db.insert(vaultMeta).values({ userId, key: "salt", value: salt }).run();
  db.insert(vaultMeta)
    .values({ userId, key: "verification_hash", value: verificationHash })
    .run();
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
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
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listCloudSecretMeta(userId: string): VaultSecretMeta[] {
  const db = getVaultDb();
  const rows = db
    .select()
    .from(vaultSecrets)
    .where(eq(vaultSecrets.userId, userId))
    .orderBy(desc(vaultSecrets.updatedAt))
    .all();
  return rows.map(rowToMeta);
}

export function getCloudSecretCipher(
  id: string,
  userId: string,
): CloudSecretCipher | null {
  const db = getVaultDb();
  const row = db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)))
    .get();
  if (!row) return null;
  return rowToCipher(row);
}

export function createCloudSecret(
  input: CloudCreateSecretInput,
  userId: string,
): VaultSecretMeta {
  const db = getVaultDb();
  const now = Date.now();
  const id = nanoid();

  db.insert(vaultSecrets)
    .values({
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
    })
    .run();

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

export function updateCloudSecret(
  input: CloudUpdateSecretInput,
  userId: string,
): VaultSecretMeta {
  const db = getVaultDb();
  const existing = db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)))
    .get();
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

  db.update(vaultSecrets)
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
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)))
    .run();

  eventBus.emit("vault", VAULT_EVENTS.SECRET_UPDATED, { id: input.id });
  return {
    id: input.id,
    name,
    category: category as SecretCategory,
    tags,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export function deleteCloudSecret(id: string, userId: string): void {
  const db = getVaultDb();
  db.delete(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)))
    .run();
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
export function rotateCloudVault(
  userId: string,
  newSalt: string,
  newVerificationHash: string,
  reencrypted: CloudReencryptSecret[],
): void {
  const db = getVaultDb();

  db.update(vaultMeta)
    .set({ value: newSalt })
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .run();
  db.update(vaultMeta)
    .set({ value: newVerificationHash })
    .where(
      and(
        eq(vaultMeta.userId, userId),
        eq(vaultMeta.key, "verification_hash"),
      ),
    )
    .run();

  for (const s of reencrypted) {
    db.update(vaultSecrets)
      .set({
        encryptedValue: s.encryptedValue,
        nonce: s.nonce,
        encryptedNotes: s.encryptedNotes ?? null,
        notesNonce: s.notesNonce ?? null,
        updatedAt: Date.now(),
      })
      .where(and(eq(vaultSecrets.id, s.id), eq(vaultSecrets.userId, userId)))
      .run();
  }
}
