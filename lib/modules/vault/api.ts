/**
 * UI-facing vault façade.
 *
 * In LOCAL mode the existing server-side flow is used: the server holds the
 * derived key in memory and handles encrypt/decrypt.
 *
 * In CLOUD mode all crypto happens in the browser via `lib/modules/vault/client.ts`.
 *
 * Components import from THIS file so the same UI works in both modes.
 */

import { isCloud } from "@/lib/core/runtime";
import {
  setupCloudVault as cloudSetup,
  unlockCloudVault as cloudUnlock,
  lockCloudVault as cloudLock,
  isVaultClientUnlocked,
  getCloudVaultStatus as cloudStatus,
  getAllCloudSecrets,
  getCloudSecret as cloudGetSecret,
  createCloudSecret as cloudCreate,
  updateCloudSecret as cloudUpdate,
  deleteCloudSecret as cloudDelete,
  changeCloudPassword as cloudChangePassword,
  subscribeVaultClient,
} from "./client";
import type {
  VaultStatus,
  VaultSecretMeta,
  VaultSecretWithValue,
  CreateSecretInput,
  UpdateSecretInput,
} from "./types";

export interface VaultSetupOptions {
  storagePath?: string;
}

export async function fetchVaultStatus(): Promise<VaultStatus> {
  if (isCloud()) return cloudStatus();
  const res = await fetch("/api/vault?action=status");
  if (!res.ok) throw new Error("Failed to fetch vault status");
  return (await res.json()) as VaultStatus;
}

export async function setupVaultUi(
  password: string,
  options: VaultSetupOptions = {},
): Promise<void> {
  if (isCloud()) {
    await cloudSetup(password);
    return;
  }
  const body: Record<string, string> = { password };
  if (options.storagePath) body.storagePath = options.storagePath;
  const res = await fetch("/api/vault?action=setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to set up vault");
  }
}

export async function unlockVaultUi(password: string): Promise<boolean> {
  if (isCloud()) return cloudUnlock(password);
  const res = await fetch("/api/vault?action=unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (res.status === 401) return false;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to unlock vault");
  }
  return true;
}

export async function lockVaultUi(): Promise<void> {
  if (isCloud()) {
    cloudLock();
    return;
  }
  const res = await fetch("/api/vault?action=lock", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to lock vault");
  }
}

export async function listSecrets(): Promise<VaultSecretMeta[]> {
  if (isCloud()) return getAllCloudSecrets();
  const res = await fetch("/api/vault");
  if (!res.ok) throw new Error("Failed to list secrets");
  return (await res.json()) as VaultSecretMeta[];
}

export async function fetchSecret(
  id: string,
): Promise<VaultSecretWithValue | null> {
  if (isCloud()) return cloudGetSecret(id);
  const res = await fetch(`/api/vault?id=${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch secret");
  return (await res.json()) as VaultSecretWithValue;
}

export async function createSecretUi(
  input: CreateSecretInput,
): Promise<VaultSecretMeta> {
  if (isCloud()) return cloudCreate(input);
  const res = await fetch("/api/vault", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to create secret");
  }
  return (await res.json()) as VaultSecretMeta;
}

export async function updateSecretUi(
  input: UpdateSecretInput,
): Promise<VaultSecretMeta> {
  if (isCloud()) return cloudUpdate(input);
  const res = await fetch("/api/vault", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to update secret");
  }
  return (await res.json()) as VaultSecretMeta;
}

export async function deleteSecretUi(id: string): Promise<void> {
  if (isCloud()) return cloudDelete(id);
  const res = await fetch(`/api/vault?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to delete secret");
  }
}

export async function changeVaultPasswordUi(
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  if (isCloud()) return cloudChangePassword(currentPassword, newPassword);
  const res = await fetch("/api/vault?action=change-password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (res.status === 401) return false;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to change password");
  }
  return true;
}

export async function changeVaultStoragePathUi(newPath: string): Promise<void> {
  if (isCloud()) {
    throw new Error("Storage path is not configurable in cloud mode");
  }
  const res = await fetch("/api/vault?action=change-path", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPath }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Failed to change storage path");
  }
}

export { isVaultClientUnlocked, subscribeVaultClient };
