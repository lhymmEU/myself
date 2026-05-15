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
  return cloudStatus();
}

export async function setupVaultUi(password: string): Promise<void> {
  await cloudSetup(password);
}

export async function unlockVaultUi(password: string): Promise<boolean> {
  return cloudUnlock(password);
}

export async function lockVaultUi(): Promise<void> {
  cloudLock();
}

export async function listSecrets(): Promise<VaultSecretMeta[]> {
  return getAllCloudSecrets();
}

export async function fetchSecret(
  id: string,
): Promise<VaultSecretWithValue | null> {
  return cloudGetSecret(id);
}

export async function createSecretUi(
  input: CreateSecretInput,
): Promise<VaultSecretMeta> {
  return cloudCreate(input);
}

export async function updateSecretUi(
  input: UpdateSecretInput,
): Promise<VaultSecretMeta> {
  return cloudUpdate(input);
}

export async function deleteSecretUi(id: string): Promise<void> {
  return cloudDelete(id);
}

export async function changeVaultPasswordUi(
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  return cloudChangePassword(currentPassword, newPassword);
}

export { isVaultClientUnlocked, subscribeVaultClient };
