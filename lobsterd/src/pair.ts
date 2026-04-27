/**
 * `lobsterd pair <code> --cloud-url ... --relay-url ...`
 *
 * Exchanges public keys with the cloud server, receives a long-lived
 * `agentJwt`, and writes everything to ~/.lobsterd/config.json.
 *
 * The keypair is X25519, used later by the agent and browser to derive a
 * shared session secret over the relay. For now we only persist it; the
 * E2E channel is wired up in `serve.ts` once the browser bundle ships its
 * matching half of the handshake.
 */

import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { x25519 } from "@noble/curves/ed25519";

import { readConfig, writeConfig } from "./config";

interface PairOptions {
  code: string;
  cloudUrl: string;
  relayUrl?: string;
  sshHost?: string;
  sshPort?: number;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function runPair(opts: PairOptions): Promise<void> {
  if (!/^\d{6}$/.test(opts.code)) {
    throw new Error("Pairing code must be 6 digits.");
  }
  if (!/^https?:\/\//.test(opts.cloudUrl)) {
    throw new Error("--cloud-url must include the protocol (https://...).");
  }

  const existing = await readConfig();
  const lobsterId =
    existing?.lobsterId ?? `${hostname()}-${randomBytes(3).toString("hex")}`;

  const sk = existing
    ? hexToBytes(existing.publicKey).length === 32
      ? null
      : x25519.utils.randomPrivateKey()
    : x25519.utils.randomPrivateKey();
  const privateKey = sk ?? x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);

  const claimUrl = `${opts.cloudUrl.replace(/\/$/, "")}/api/claw/pair/claim`;
  const res = await fetch(claimUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: opts.code,
      lobsterId,
      publicKey: bytesToHex(publicKey),
      hostname: hostname(),
      port: opts.sshPort ?? 22,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Pairing failed (${res.status}): ${errBody}`);
  }

  const body = (await res.json()) as {
    connectionId: string;
    agentJwt: string;
    relayUrl: string;
    pairingToken: string;
  };

  // The relayUrl returned by the cloud already has the agentJwt embedded
  // for the first connect, but we store the bare base separately so we can
  // refresh tokens later without rewriting the config.
  const relayBase =
    opts.relayUrl ?? body.relayUrl.replace(/\?.*$/, "").replace(/\/pair\/.*$/, "");

  await writeConfig({
    lobsterId,
    cloudUrl: opts.cloudUrl,
    relayUrl: relayBase,
    pairingToken: body.pairingToken,
    agentJwt: body.agentJwt,
    publicKey: bytesToHex(publicKey),
    sshHost: opts.sshHost ?? "127.0.0.1",
    sshPort: opts.sshPort ?? 22,
  });

  console.log(`Paired as ${lobsterId}.`);
  console.log(`Connection id: ${body.connectionId}`);
  console.log(`Run 'npm run lobsterd -- serve' to bring it online.`);
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}
