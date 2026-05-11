import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";

function key32(): Buffer {
  const secret = process.env.MYSELF_OPENCLAW_TOKEN_KEY?.trim();
  if (!secret) {
    throw new Error(
      "MYSELF_OPENCLAW_TOKEN_KEY is not set (use a long random secret; it is hashed to a 32-byte AES key).",
    );
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSettingsSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key32(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, enc, tag]).toString("base64url");
  return `${PREFIX}${blob}`;
}

export function decryptSettingsSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    throw new Error("Unrecognised encrypted token format");
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
  if (raw.length < 12 + 16) {
    throw new Error("Corrupt encrypted token");
  }
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(raw.length - 16);
  const enc = raw.subarray(12, raw.length - 16);
  const decipher = createDecipheriv(ALGO, key32(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
