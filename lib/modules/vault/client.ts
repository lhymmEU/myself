/**
 * Browser-side vault client.
 *
 * In cloud mode this is the ONLY component that ever sees the master key,
 * the password, or any plaintext. The server only stores ciphertext + nonce.
 *
 * In local mode this file is unused — the server handles crypto directly.
 *
 * The unlocked master key lives in module-scope memory for the current
 * tab session. It is wiped on `lock()`, page reload, and tab close.
 * It is NEVER persisted to localStorage / sessionStorage / cookies.
 */

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

interface CipherSecret {
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

let _masterKey: Uint8Array | null = null;
let _initialized: boolean | null = null;

const _listeners = new Set<() => void>();

function notify() {
  for (const fn of _listeners) fn();
}

export function subscribeVaultClient(fn: () => void): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}

export function isVaultClientUnlocked(): boolean {
  return _masterKey !== null;
}

export async function getCloudVaultStatus(): Promise<VaultStatus> {
  const res = await fetch("/api/vault?action=status");
  if (!res.ok) throw new Error("Failed to fetch vault status");
  const status = (await res.json()) as VaultStatus;
  _initialized = status.initialized;
  return {
    ...status,
    unlocked: isVaultClientUnlocked() && status.initialized,
  };
}

interface CloudVaultInfo {
  initialized: boolean;
  salt: string | null;
  verificationHash: string | null;
}

async function fetchVaultInfo(): Promise<CloudVaultInfo> {
  const res = await fetch("/api/vault?action=info");
  if (!res.ok) throw new Error("Failed to fetch vault info");
  return (await res.json()) as CloudVaultInfo;
}

export async function setupCloudVault(password: string): Promise<void> {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  const salt = generateSalt();
  const key = deriveKey(password, salt);
  const verificationHash = createVerificationHash(key);

  const res = await fetch("/api/vault?action=setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ salt, verificationHash }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to set up vault");
  }
  _masterKey = key;
  _initialized = true;
  notify();
}

export async function unlockCloudVault(password: string): Promise<boolean> {
  const info = await fetchVaultInfo();
  if (!info.initialized || !info.salt || !info.verificationHash) {
    throw new Error("Vault not initialized");
  }
  const key = deriveKey(password, info.salt);
  if (createVerificationHash(key) !== info.verificationHash) {
    return false;
  }
  _masterKey = key;
  notify();
  return true;
}

export function lockCloudVault(): void {
  if (_masterKey) {
    _masterKey.fill(0);
    _masterKey = null;
    notify();
  }
}

function requireKey(): Uint8Array {
  if (!_masterKey) throw new Error("Vault is locked");
  return _masterKey;
}

export async function getAllCloudSecrets(): Promise<VaultSecretMeta[]> {
  const res = await fetch("/api/vault");
  if (!res.ok) throw new Error("Failed to list secrets");
  return (await res.json()) as VaultSecretMeta[];
}

export async function getCloudSecret(
  id: string,
): Promise<VaultSecretWithValue | null> {
  const key = requireKey();
  const res = await fetch(
    `/api/vault?id=${encodeURIComponent(id)}&format=cipher`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch secret");
  const cipher = (await res.json()) as CipherSecret;
  const value = decrypt(key, cipher.encryptedValue, cipher.nonce);
  let notes: string | undefined;
  if (cipher.encryptedNotes && cipher.notesNonce) {
    try {
      notes = decrypt(key, cipher.encryptedNotes, cipher.notesNonce);
    } catch {
      notes = undefined;
    }
  }
  return {
    id: cipher.id,
    name: cipher.name,
    category: cipher.category,
    tags: cipher.tags,
    createdAt: cipher.createdAt,
    updatedAt: cipher.updatedAt,
    value,
    notes,
  };
}

export async function createCloudSecret(
  input: CreateSecretInput,
): Promise<VaultSecretMeta> {
  const key = requireKey();
  const enc = encrypt(key, input.value);
  let encryptedNotes: string | null = null;
  let notesNonce: string | null = null;
  if (input.notes) {
    const ne = encrypt(key, input.notes);
    encryptedNotes = ne.ciphertext;
    notesNonce = ne.nonce;
  }
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      category: input.category,
      encryptedValue: enc.ciphertext,
      nonce: enc.nonce,
      encryptedNotes,
      notesNonce,
      tags: input.tags ?? [],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create secret");
  }
  return (await res.json()) as VaultSecretMeta;
}

export async function updateCloudSecret(
  input: UpdateSecretInput,
): Promise<VaultSecretMeta> {
  const key = requireKey();
  const body: Record<string, unknown> = { id: input.id };
  if (input.name !== undefined) body.name = input.name;
  if (input.category !== undefined) body.category = input.category;
  if (input.tags !== undefined) body.tags = input.tags;
  if (input.value !== undefined) {
    const enc = encrypt(key, input.value);
    body.encryptedValue = enc.ciphertext;
    body.nonce = enc.nonce;
  }
  if (input.notes !== undefined) {
    if (input.notes) {
      const ne = encrypt(key, input.notes);
      body.encryptedNotes = ne.ciphertext;
      body.notesNonce = ne.nonce;
    } else {
      body.encryptedNotes = null;
      body.notesNonce = null;
    }
  }
  const res = await fetch("/api/vault", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update secret");
  }
  return (await res.json()) as VaultSecretMeta;
}

export async function deleteCloudSecret(id: string): Promise<void> {
  const res = await fetch(`/api/vault?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete secret");
  }
}

/**
 * Re-encrypts every secret under a new password in the browser, then ships
 * the batch in one request. Server never sees any plaintext.
 */
export async function changeCloudPassword(
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const info = await fetchVaultInfo();
  if (!info.initialized || !info.salt || !info.verificationHash) {
    throw new Error("Vault not initialized");
  }
  const oldKey = deriveKey(currentPassword, info.salt);
  if (createVerificationHash(oldKey) !== info.verificationHash) {
    return false;
  }
  const newSalt = generateSalt();
  const newKey = deriveKey(newPassword, newSalt);
  const newVerificationHash = createVerificationHash(newKey);

  const listRes = await fetch("/api/vault?format=cipher");
  if (!listRes.ok) throw new Error("Failed to load secrets for re-encryption");
  const ciphers = (await listRes.json()) as CipherSecret[];

  const reencrypted = ciphers.map((c) => {
    const value = decrypt(oldKey, c.encryptedValue, c.nonce);
    const enc = encrypt(newKey, value);
    let encryptedNotes: string | null = null;
    let notesNonce: string | null = null;
    if (c.encryptedNotes && c.notesNonce) {
      try {
        const notes = decrypt(oldKey, c.encryptedNotes, c.notesNonce);
        const ne = encrypt(newKey, notes);
        encryptedNotes = ne.ciphertext;
        notesNonce = ne.nonce;
      } catch {
        encryptedNotes = c.encryptedNotes;
        notesNonce = c.notesNonce;
      }
    }
    return {
      id: c.id,
      encryptedValue: enc.ciphertext,
      nonce: enc.nonce,
      encryptedNotes,
      notesNonce,
    };
  });

  const res = await fetch("/api/vault?action=change-password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      newSalt,
      newVerificationHash,
      reencrypted,
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to rotate vault");
  }

  oldKey.fill(0);
  if (_masterKey) _masterKey.fill(0);
  _masterKey = newKey;
  notify();
  return true;
}

/** Returns null if not yet known. Used for one-time bootstrap checks. */
export function getCachedInitialized(): boolean | null {
  return _initialized;
}
