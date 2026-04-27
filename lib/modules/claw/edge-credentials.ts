"use client";

/**
 * Browser-only helper that decrypts a vault entry into the SSH credential
 * shape `gossh-wasm` expects.
 *
 * The plaintext is held in browser memory only — it is wiped from
 * `gossh-wasm`'s linear memory on disconnect, and we do not persist it
 * anywhere on the client side. The server only ever sees ciphertext.
 *
 * Vault entries created by `add-edge-server.tsx` store a JSON blob in the
 * `value` field shaped like:
 *   { authMethod: "password", password: "…" }
 *   { authMethod: "key",      privateKey: "-----BEGIN…", passphrase?: "…" }
 *
 * Older or hand-edited entries that are just the raw key PEM are accepted
 * for backwards compatibility — they're treated as `authMethod: "key"`.
 */

import { getCloudSecret } from "@/lib/modules/vault/client";

export type EdgeAuthMethod = "password" | "key";

export interface EdgeCredential {
  authMethod: EdgeAuthMethod;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

interface RawCredentialBlob {
  authMethod?: EdgeAuthMethod | string;
  password?: string;
  privateKey?: string;
  keyPEM?: string;
  passphrase?: string;
  keyPassphrase?: string;
}

const PEM_HEADER_RE = /-----BEGIN [A-Z ]+-----/;

function parseCredentialBlob(raw: string): EdgeCredential {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Vault credential is empty.");
  }

  // Backwards-compat: a bare PEM key was a valid value before this feature.
  if (PEM_HEADER_RE.test(trimmed)) {
    return { authMethod: "key", privateKey: trimmed };
  }

  let parsed: RawCredentialBlob;
  try {
    parsed = JSON.parse(trimmed) as RawCredentialBlob;
  } catch {
    throw new Error(
      "Vault credential is not valid JSON. Re-add the server in Claw settings.",
    );
  }

  const method = parsed.authMethod;
  if (method === "password") {
    if (!parsed.password) {
      throw new Error("Vault credential is missing a password.");
    }
    return { authMethod: "password", password: parsed.password };
  }
  if (method === "key") {
    const pem = parsed.privateKey ?? parsed.keyPEM;
    if (!pem) {
      throw new Error("Vault credential is missing a private key.");
    }
    return {
      authMethod: "key",
      privateKey: pem,
      passphrase: parsed.passphrase ?? parsed.keyPassphrase,
    };
  }
  throw new Error(
    `Unknown authMethod "${String(method)}" in vault credential.`,
  );
}

/**
 * Resolve a `claw_connections.credentialSecretId` to a usable credential.
 * Throws if the vault is locked, the secret is missing, or the blob is
 * malformed — callers should surface a friendly retry/unlock UI.
 */
export async function loadEdgeCredential(
  credentialSecretId: string,
): Promise<EdgeCredential> {
  const secret = await getCloudSecret(credentialSecretId);
  if (!secret) {
    throw new Error(
      "SSH credential not found in vault. Re-add the server or restore the secret.",
    );
  }
  return parseCredentialBlob(secret.value);
}

/**
 * Encode an EdgeCredential as the JSON string we store inside a vault
 * secret's `value` field.
 */
export function encodeEdgeCredential(cred: EdgeCredential): string {
  if (cred.authMethod === "password") {
    if (!cred.password) throw new Error("password is required");
    return JSON.stringify({ authMethod: "password", password: cred.password });
  }
  if (!cred.privateKey) throw new Error("privateKey is required");
  const blob: RawCredentialBlob = {
    authMethod: "key",
    privateKey: cred.privateKey,
  };
  if (cred.passphrase) blob.passphrase = cred.passphrase;
  return JSON.stringify(blob);
}
