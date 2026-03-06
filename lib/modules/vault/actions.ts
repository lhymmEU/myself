import { nanoid } from "nanoid";
import fs from "fs";
import { eventBus } from "@/lib/core/event-bus";
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

let _masterKey: Uint8Array | null = null;

function requireUnlocked(): Uint8Array {
  if (!_masterKey) throw new Error("Vault is locked");
  return _masterKey;
}

export function isVaultInitialized(): boolean {
  const db = getVaultDb();
  const row = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'salt'")
    .get() as { value: string } | undefined;
  return !!row;
}

export function isVaultUnlocked(): boolean {
  return _masterKey !== null;
}

export function getVaultStatus(): VaultStatus {
  const initialized = isVaultInitialized();
  let secretCount = 0;
  if (initialized) {
    const db = getVaultDb();
    const row = db
      .prepare("SELECT COUNT(*) as count FROM vault_secrets")
      .get() as { count: number };
    secretCount = row.count;
  }
  return {
    initialized,
    unlocked: isVaultUnlocked(),
    secretCount,
    storagePath: getVaultPathSetting(),
  };
}

export function setupVault(password: string, storagePath?: string): void {
  if (storagePath) {
    moveVaultDb(storagePath);
  }

  const db = getVaultDb();

  const existing = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'salt'")
    .get();
  if (existing) throw new Error("Vault is already initialized");

  const salt = generateSalt();
  const key = deriveKey(password, salt);
  const hash = createVerificationHash(key);

  db.prepare(
    "INSERT INTO vault_meta (key, value) VALUES (?, ?)"
  ).run("salt", salt);
  db.prepare(
    "INSERT INTO vault_meta (key, value) VALUES (?, ?)"
  ).run("verification_hash", hash);

  _masterKey = key;
  eventBus.emit("vault", VAULT_EVENTS.VAULT_UNLOCKED, {});
}

export function unlockVault(password: string): boolean {
  const db = getVaultDb();
  const saltRow = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'salt'")
    .get() as { value: string } | undefined;
  const hashRow = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'verification_hash'")
    .get() as { value: string } | undefined;

  if (!saltRow || !hashRow) throw new Error("Vault not initialized");

  const key = deriveKey(password, saltRow.value);
  const computedHash = createVerificationHash(key);

  if (computedHash !== hashRow.value) return false;

  _masterKey = key;
  eventBus.emit("vault", VAULT_EVENTS.VAULT_UNLOCKED, {});
  return true;
}

export function lockVault(): void {
  if (_masterKey) {
    _masterKey.fill(0);
    _masterKey = null;
  }
  eventBus.emit("vault", VAULT_EVENTS.VAULT_LOCKED, {});
}

interface SecretRow {
  id: string;
  name: string;
  category: string;
  encrypted_value: string;
  nonce: string;
  encrypted_notes: string | null;
  notes_nonce: string | null;
  tags: string;
  created_at: number;
  updated_at: number;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToFull(row: SecretRow, key: Uint8Array): VaultSecretWithValue {
  const meta = rowToMeta(row);
  const value = decrypt(key, row.encrypted_value, row.nonce);
  let notes: string | undefined;
  if (row.encrypted_notes && row.notes_nonce) {
    try {
      notes = decrypt(key, row.encrypted_notes, row.notes_nonce);
    } catch {
      notes = undefined;
    }
  }
  return { ...meta, value, notes };
}

export function getAllSecrets(): VaultSecretMeta[] {
  requireUnlocked();
  const db = getVaultDb();
  const rows = db
    .prepare(
      "SELECT id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at FROM vault_secrets ORDER BY updated_at DESC"
    )
    .all() as SecretRow[];
  return rows.map(rowToMeta);
}

export function getSecret(id: string): VaultSecretWithValue | null {
  const key = requireUnlocked();
  const db = getVaultDb();
  const row = db
    .prepare(
      "SELECT id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at FROM vault_secrets WHERE id = ?"
    )
    .get(id) as SecretRow | undefined;
  if (!row) return null;
  return rowToFull(row, key);
}

export function createSecret(input: CreateSecretInput): VaultSecretMeta {
  const key = requireUnlocked();
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

  db.prepare(
    `INSERT INTO vault_secrets (id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.category ?? "other",
    ciphertext,
    nonce,
    encryptedNotes,
    notesNonce,
    JSON.stringify(input.tags ?? []),
    now,
    now
  );

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

export function updateSecret(input: UpdateSecretInput): VaultSecretMeta {
  const key = requireUnlocked();
  const db = getVaultDb();
  const now = Date.now();

  const existing = db
    .prepare("SELECT * FROM vault_secrets WHERE id = ?")
    .get(input.id) as SecretRow | undefined;
  if (!existing) throw new Error(`Secret not found: ${input.id}`);

  const name = input.name ?? existing.name;
  const category = input.category ?? existing.category;
  const tags = input.tags ?? JSON.parse(existing.tags);

  let encVal = existing.encrypted_value;
  let encNonce = existing.nonce;
  if (input.value !== undefined) {
    const enc = encrypt(key, input.value);
    encVal = enc.ciphertext;
    encNonce = enc.nonce;
  }

  let encNotes = existing.encrypted_notes;
  let notesNonce = existing.notes_nonce;
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

  db.prepare(
    `UPDATE vault_secrets
     SET name = ?, category = ?, encrypted_value = ?, nonce = ?,
         encrypted_notes = ?, notes_nonce = ?, tags = ?, updated_at = ?
     WHERE id = ?`
  ).run(name, category, encVal, encNonce, encNotes, notesNonce, JSON.stringify(tags), now, input.id);

  const result: VaultSecretMeta = {
    id: input.id,
    name,
    category: category as SecretCategory,
    tags,
    createdAt: existing.created_at,
    updatedAt: now,
  };

  eventBus.emit("vault", VAULT_EVENTS.SECRET_UPDATED, { id: input.id });
  return result;
}

export function deleteSecret(id: string): void {
  requireUnlocked();
  const db = getVaultDb();
  db.prepare("DELETE FROM vault_secrets WHERE id = ?").run(id);
  eventBus.emit("vault", VAULT_EVENTS.SECRET_DELETED, { id });
}

export function changePassword(
  currentPassword: string,
  newPassword: string
): boolean {
  const db = getVaultDb();
  const saltRow = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'salt'")
    .get() as { value: string } | undefined;
  const hashRow = db
    .prepare("SELECT value FROM vault_meta WHERE key = 'verification_hash'")
    .get() as { value: string } | undefined;

  if (!saltRow || !hashRow) throw new Error("Vault not initialized");

  const oldKey = deriveKey(currentPassword, saltRow.value);
  if (createVerificationHash(oldKey) !== hashRow.value) return false;

  const rows = db
    .prepare(
      "SELECT id, name, category, encrypted_value, nonce, encrypted_notes, notes_nonce, tags, created_at, updated_at FROM vault_secrets"
    )
    .all() as SecretRow[];

  const decrypted = rows.map((row) => rowToFull(row, oldKey));

  const newSalt = generateSalt();
  const newKey = deriveKey(newPassword, newSalt);
  const newHash = createVerificationHash(newKey);

  const tx = db.transaction(() => {
    db.prepare("UPDATE vault_meta SET value = ? WHERE key = 'salt'").run(newSalt);
    db.prepare("UPDATE vault_meta SET value = ? WHERE key = 'verification_hash'").run(newHash);

    for (const secret of decrypted) {
      const enc = encrypt(newKey, secret.value);
      let encNotes: string | null = null;
      let notesNonce: string | null = null;
      if (secret.notes) {
        const ne = encrypt(newKey, secret.notes);
        encNotes = ne.ciphertext;
        notesNonce = ne.nonce;
      }
      db.prepare(
        `UPDATE vault_secrets
         SET encrypted_value = ?, nonce = ?, encrypted_notes = ?, notes_nonce = ?
         WHERE id = ?`
      ).run(enc.ciphertext, enc.nonce, encNotes, notesNonce, secret.id);
    }
  });

  tx();
  _masterKey = newKey;
  return true;
}

export function changeVaultPath(newPath: string): void {
  const wasUnlocked = isVaultUnlocked();
  const savedKey = _masterKey ? new Uint8Array(_masterKey) : null;

  moveVaultDb(newPath);

  if (wasUnlocked && savedKey) {
    _masterKey = savedKey;
  }
}

export function getStoragePath(): string {
  return getVaultPathSetting();
}

export function getVaultDbFileSize(): number {
  const p = getVaultPathSetting();
  try {
    const stat = fs.statSync(p);
    return stat.size;
  } catch {
    return 0;
  }
}
