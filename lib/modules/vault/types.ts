export type SecretCategory =
  | "password"
  | "api_key"
  | "credential"
  | "note"
  | "certificate"
  | "ssh_key"
  | "crypto_wallet"
  | "other";

export const SECRET_CATEGORIES: { value: SecretCategory; label: string }[] = [
  { value: "password", label: "Password" },
  { value: "api_key", label: "API Key" },
  { value: "credential", label: "Credential" },
  { value: "note", label: "Secure Note" },
  { value: "certificate", label: "Certificate" },
  { value: "ssh_key", label: "SSH Key" },
  { value: "crypto_wallet", label: "Crypto Wallet" },
  { value: "other", label: "Other" },
];

export interface VaultSecretMeta {
  id: string;
  name: string;
  category: SecretCategory;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface VaultSecretWithValue extends VaultSecretMeta {
  value: string;
  notes?: string;
}

export interface CreateSecretInput {
  name: string;
  value: string;
  category?: SecretCategory;
  notes?: string;
  tags?: string[];
}

export interface UpdateSecretInput {
  id: string;
  name?: string;
  value?: string;
  category?: SecretCategory;
  notes?: string;
  tags?: string[];
}

export interface VaultStatus {
  initialized: boolean;
  unlocked: boolean;
  secretCount: number;
  storagePath: string;
}
