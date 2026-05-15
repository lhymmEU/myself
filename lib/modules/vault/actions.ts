import { nanoid } from "nanoid";
import { and, desc, eq, sql } from "drizzle-orm";

import { eventBus } from "@/lib/core/event-bus";
import { vaultMeta, vaultSecrets } from "@/lib/db/schema/postgres/vault";
import { getVaultDb, getVaultPathSetting, moveVaultDb } from "./vault-db";
import { VAULT_EVENTS } from "./events";
import {
  generateSalt,
  deriveKey,
  createVerificationHash,
  encrypt,
  decrypt,
} from "./crypto";
import type {
  VaultSecretMeta,
  VaultSecretWithValue,
  CreateSecretInput,
  UpdateSecretInput,
  VaultStatus,
  SecretCategory,
} from "./types";

/**
 * Per-user master key cache. Local mode keeps a single entry under the
 * sentinel user id; cloud keeps one per signed-in user.
 */
const _masterKeys: Map<string, Uint8Array> = new Map();

function requireUnlocked(userId: string): Uint8Array {
  const key = _masterKeys.get(userId);
  if (!key) throw new Error("Vault is locked");
  return key;
}

export async function isVaultInitialized(
  userId: string,
): Promise<boolean> {
  const db = getVaultDb();
  const rows = await db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .limit(1);
  return !!rows[0];
}

export function isVaultUnlocked(userId: string): boolean {
  return _masterKeys.has(userId);
}

export async function getVaultStatus(
  userId: string,
): Promise<VaultStatus> {
  const initialized = await isVaultInitialized(userId);
  let secretCount = 0;
  if (initialized) {
    const db = getVaultDb();
    const rows = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(vaultSecrets)
      .where(eq(vaultSecrets.userId, userId));
    secretCount = Number(rows[0]?.count ?? 0);
  }
  return {
    initialized,
    unlocked: isVaultUnlocked(userId),
    secretCount,
    storagePath: getVaultPathSetting(),
  };
}

export async function setupVault(
  password: string,
  userId: string,
  storagePath?: string,
): Promise<void> {
  if (storagePath) {
    moveVaultDb(storagePath);
  }

  const db = getVaultDb();
  const existing = await db
    .select()
    .from(vaultMeta)
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")))
    .limit(1);
  if (existing[0]) throw new Error("Vault is already initialized");

  const salt = generateSalt();
  const key = deriveKey(password, salt);
  const hash = createVerificationHash(key);

  await db.insert(vaultMeta).values({ userId, key: "salt", value: salt });
  await db
    .insert(vaultMeta)
    .values({ userId, key: "verification_hash", value: hash });

  _masterKeys.set(userId, key);
  eventBus.emit("vault", VAULT_EVENTS.VAULT_UNLOCKED, {});
}

export async function unlockVault(
  password: string,
  userId: string,
): Promise<boolean> {
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
  if (!saltRow || !hashRow) throw new Error("Vault not initialized");

  const key = deriveKey(password, saltRow.value);
  const computedHash = createVerificationHash(key);
  if (computedHash !== hashRow.value) return false;

  _masterKeys.set(userId, key);
  eventBus.emit("vault", VAULT_EVENTS.VAULT_UNLOCKED, {});
  return true;
}

export function lockVault(userId: string): void {
  const existing = _masterKeys.get(userId);
  if (existing) {
    existing.fill(0);
    _masterKeys.delete(userId);
  }
  eventBus.emit("vault", VAULT_EVENTS.VAULT_LOCKED, {});
}

type SecretRow = typeof vaultSecrets.$inferSelect;

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

function rowToFull(row: SecretRow, key: Uint8Array): VaultSecretWithValue {
  const meta = rowToMeta(row);
  const value = decrypt(key, row.encryptedValue, row.nonce);
  let notes: string | undefined;
  if (row.encryptedNotes && row.notesNonce) {
    try {
      notes = decrypt(key, row.encryptedNotes, row.notesNonce);
    } catch {
      notes = undefined;
    }
  }
  return { ...meta, value, notes };
}

export async function getAllSecrets(
  userId: string,
): Promise<VaultSecretMeta[]> {
  requireUnlocked(userId);
  const db = getVaultDb();
  const rows = await db
    .select()
    .from(vaultSecrets)
    .where(eq(vaultSecrets.userId, userId))
    .orderBy(desc(vaultSecrets.updatedAt));
  return rows.map(rowToMeta);
}

export async function getSecret(
  id: string,
  userId: string,
): Promise<VaultSecretWithValue | null> {
  const key = requireUnlocked(userId);
  const db = getVaultDb();
  const rows = await db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return rowToFull(row, key);
}

export async function createSecret(
  input: CreateSecretInput,
  userId: string,
): Promise<VaultSecretMeta> {
  const key = requireUnlocked(userId);
  const db = getVaultDb();
  const now = Date.now();
  const id = nanoid();

  const { ciphertext, nonce } = encrypt(key, input.value);
  let encryptedNotes: string | null = null;
  let notesNonce: string | null = null;
  if (input.notes) {
    const enc = encrypt(key, input.notes);
    encryptedNotes = enc.ciphertext;
    notesNonce = enc.nonce;
  }

  await db.insert(vaultSecrets).values({
    id,
    userId,
    name: input.name,
    category: input.category ?? "other",
    encryptedValue: ciphertext,
    nonce,
    encryptedNotes,
    notesNonce,
    tags: JSON.stringify(input.tags ?? []),
    createdAt: now,
    updatedAt: now,
  });

  const result: VaultSecretMeta = {
    id,
    name: input.name,
    category: (input.category ?? "other") as SecretCategory,
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  eventBus.emit("vault", VAULT_EVENTS.SECRET_CREATED, { id });
  return result;
}

export async function updateSecret(
  input: UpdateSecretInput,
  userId: string,
): Promise<VaultSecretMeta> {
  const key = requireUnlocked(userId);
  const db = getVaultDb();
  const now = Date.now();

  const existingRows = await db
    .select()
    .from(vaultSecrets)
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error(`Secret not found: ${input.id}`);

  const name = input.name ?? existing.name;
  const category = input.category ?? existing.category;
  const tags = input.tags ?? JSON.parse(existing.tags);

  let encVal = existing.encryptedValue;
  let encNonce = existing.nonce;
  if (input.value !== undefined) {
    const enc = encrypt(key, input.value);
    encVal = enc.ciphertext;
    encNonce = enc.nonce;
  }

  let encNotes: string | null = existing.encryptedNotes ?? null;
  let notesNonce: string | null = existing.notesNonce ?? null;
  if (input.notes !== undefined) {
    if (input.notes) {
      const enc = encrypt(key, input.notes);
      encNotes = enc.ciphertext;
      notesNonce = enc.nonce;
    } else {
      encNotes = null;
      notesNonce = null;
    }
  }

  await db
    .update(vaultSecrets)
    .set({
      name,
      category,
      encryptedValue: encVal,
      nonce: encNonce,
      encryptedNotes: encNotes,
      notesNonce,
      tags: JSON.stringify(tags),
      updatedAt: now,
    })
    .where(and(eq(vaultSecrets.id, input.id), eq(vaultSecrets.userId, userId)));

  const result: VaultSecretMeta = {
    id: input.id,
    name,
    category: category as SecretCategory,
    tags,
    createdAt: Number(existing.createdAt),
    updatedAt: now,
  };

  eventBus.emit("vault", VAULT_EVENTS.SECRET_UPDATED, { id: input.id });
  return result;
}

export async function deleteSecret(
  id: string,
  userId: string,
): Promise<void> {
  requireUnlocked(userId);
  const db = getVaultDb();
  await db
    .delete(vaultSecrets)
    .where(and(eq(vaultSecrets.id, id), eq(vaultSecrets.userId, userId)));
  eventBus.emit("vault", VAULT_EVENTS.SECRET_DELETED, { id });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  userId: string,
): Promise<boolean> {
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
  if (!saltRow || !hashRow) throw new Error("Vault not initialized");

  const oldKey = deriveKey(currentPassword, saltRow.value);
  if (createVerificationHash(oldKey) !== hashRow.value) return false;

  const rows = await db
    .select()
    .from(vaultSecrets)
    .where(eq(vaultSecrets.userId, userId));
  const decrypted = rows.map((row: SecretRow) => rowToFull(row, oldKey));

  const newSalt = generateSalt();
  const newKey = deriveKey(newPassword, newSalt);
  const newHash = createVerificationHash(newKey);

  await db
    .update(vaultMeta)
    .set({ value: newSalt })
    .where(and(eq(vaultMeta.userId, userId), eq(vaultMeta.key, "salt")));
  await db
    .update(vaultMeta)
    .set({ value: newHash })
    .where(
      and(
        eq(vaultMeta.userId, userId),
        eq(vaultMeta.key, "verification_hash"),
      ),
    );

  for (const secret of decrypted) {
    const enc = encrypt(newKey, secret.value);
    let encNotes: string | null = null;
    let notesNonce: string | null = null;
    if (secret.notes) {
      const ne = encrypt(newKey, secret.notes);
      encNotes = ne.ciphertext;
      notesNonce = ne.nonce;
    }
    await db
      .update(vaultSecrets)
      .set({
        encryptedValue: enc.ciphertext,
        nonce: enc.nonce,
        encryptedNotes: encNotes,
        notesNonce,
      })
      .where(
        and(eq(vaultSecrets.id, secret.id), eq(vaultSecrets.userId, userId)),
      );
  }

  _masterKeys.set(userId, newKey);
  return true;
}

export function getStoragePath(): string {
  return getVaultPathSetting();
}

export function getVaultDbFileSize(): number {
  return 0;
}
