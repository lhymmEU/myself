import { xchacha20poly1305 } from "@noble/ciphers/chacha";
import { scrypt } from "@noble/hashes/scrypt";
import { sha3_256 } from "@noble/hashes/sha3";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils";

/**
 * Post-quantum secure encryption using:
 * - scrypt for key derivation (symmetric, quantum-resistant)
 * - XChaCha20-Poly1305 for authenticated encryption (256-bit key)
 * - SHA3-256 for password verification (Keccak, designed with quantum resistance)
 *
 * All primitives are symmetric — immune to Shor's algorithm.
 * AES-256 / XChaCha20 provide 128+ bits of quantum security (Grover's bound).
 */

const SCRYPT_OPTS = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };

export function generateSalt(): string {
  return bytesToHex(randomBytes(32));
}

export function deriveKey(password: string, saltHex: string): Uint8Array {
  const salt = hexToBytes(saltHex);
  const passwordBytes = new TextEncoder().encode(password);
  return scrypt(passwordBytes, salt, SCRYPT_OPTS);
}

export function createVerificationHash(key: Uint8Array): string {
  return bytesToHex(sha3_256(key));
}

export function encrypt(
  key: Uint8Array,
  plaintext: string
): { ciphertext: string; nonce: string } {
  const nonce = randomBytes(24);
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const cipher = xchacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(plaintextBytes);
  return {
    ciphertext: bytesToHex(encrypted),
    nonce: bytesToHex(nonce),
  };
}

export function decrypt(
  key: Uint8Array,
  ciphertextHex: string,
  nonceHex: string
): string {
  const ciphertext = hexToBytes(ciphertextHex);
  const nonce = hexToBytes(nonceHex);
  const cipher = xchacha20poly1305(key, nonce);
  const decrypted = cipher.decrypt(ciphertext);
  return new TextDecoder().decode(decrypted);
}
