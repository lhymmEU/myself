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
 *
 * PEM normalisation: we accept every flavour Go's `crypto/ssh` understands —
 * RSA / EC / DSA PKCS#1, PKCS#8 (`PRIVATE KEY` and `ENCRYPTED PRIVATE KEY`),
 * and OpenSSH (`OPENSSH PRIVATE KEY`). Files dropped by Windows tooling can
 * carry CRLF line endings and a UTF-8 BOM; both confuse the Go parser, so we
 * canonicalise to LF + trimmed lines before storing.
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

const PEM_BEGIN_RE = /-----BEGIN ([A-Z0-9 ]+?)-----/;
const PEM_END_RE = /-----END ([A-Z0-9 ]+?)-----/;
const SUPPORTED_PEM_LABELS = new Set([
  "RSA PRIVATE KEY",
  "DSA PRIVATE KEY",
  "EC PRIVATE KEY",
  "PRIVATE KEY",
  "ENCRYPTED PRIVATE KEY",
  "OPENSSH PRIVATE KEY",
]);

/**
 * Normalises a PEM block so `gossh-wasm`'s Go parser can read it regardless
 * of how the file was authored:
 *   - strips a leading UTF-8 BOM
 *   - converts CRLF / CR line endings to LF
 *   - trims trailing whitespace on each line
 *   - drops blank padding lines outside the BEGIN…END block
 *   - guarantees a trailing newline (Go's `pem.Decode` is strict about it)
 */
export function normalizePem(raw: string): string {
  if (!raw) return raw;
  let text = raw.replace(/^\uFEFF/, "");
  text = text.replace(/\r\n?/g, "\n");
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n")
    .trim();
  return text ? `${text}\n` : "";
}

export interface PemKeyInfo {
  label: string;
  /** True when the PEM header signals an encrypted/passphrase-protected key */
  encrypted: boolean;
  /** True when this label is one Go's crypto/ssh actually understands */
  supported: boolean;
}

/**
 * Inspects a PEM block and returns the discovered label (e.g. "RSA PRIVATE
 * KEY"), whether it appears encrypted, and whether the SSH stack can parse
 * it. Returns `null` when the input doesn't look like a PEM block at all.
 */
export function inspectPemKey(raw: string): PemKeyInfo | null {
  const normalised = normalizePem(raw);
  const begin = PEM_BEGIN_RE.exec(normalised);
  const end = PEM_END_RE.exec(normalised);
  if (!begin || !end) return null;
  const label = begin[1]?.trim() ?? "";
  if (!label || begin[1] !== end[1]) return null;
  const encrypted =
    /ENCRYPTED PRIVATE KEY/.test(label) ||
    /Proc-Type:\s*4,ENCRYPTED/i.test(normalised) ||
    /DEK-Info:/i.test(normalised);
  return {
    label,
    encrypted,
    supported: SUPPORTED_PEM_LABELS.has(label),
  };
}

function looksLikePem(raw: string): boolean {
  return PEM_BEGIN_RE.test(raw);
}

function parseCredentialBlob(raw: string): EdgeCredential {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Vault credential is empty.");
  }

  // Backwards-compat: a bare PEM key was a valid value before this feature.
  if (looksLikePem(trimmed)) {
    return { authMethod: "key", privateKey: normalizePem(trimmed) };
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
      privateKey: normalizePem(pem),
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
 * secret's `value` field. PEM keys are canonicalised here so every entry on
 * disk has consistent line endings, and we sanity-check the header so the
 * user gets an immediate error instead of a cryptic Go parser failure on
 * first connect.
 */
export function encodeEdgeCredential(cred: EdgeCredential): string {
  if (cred.authMethod === "password") {
    if (!cred.password) throw new Error("password is required");
    return JSON.stringify({ authMethod: "password", password: cred.password });
  }
  if (!cred.privateKey) throw new Error("privateKey is required");
  const pem = normalizePem(cred.privateKey);
  const info = inspectPemKey(pem);
  if (!info) {
    throw new Error(
      "Private key is not a valid PEM block. Expected a file starting with `-----BEGIN ... PRIVATE KEY-----`.",
    );
  }
  if (!info.supported) {
    throw new Error(
      `Unsupported PEM label "${info.label}". Convert the key to OpenSSH or PKCS#8 format with \`ssh-keygen -p -m PEM\` (or -m PKCS8).`,
    );
  }
  if (info.encrypted && !cred.passphrase) {
    throw new Error(
      "This PEM is passphrase-protected. Enter the passphrase to unlock it before saving.",
    );
  }
  const blob: RawCredentialBlob = {
    authMethod: "key",
    privateKey: pem,
  };
  if (cred.passphrase) blob.passphrase = cred.passphrase;
  return JSON.stringify(blob);
}
