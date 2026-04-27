/**
 * On-disk config for lobsterd. Stored under `~/.lobsterd/config.json` (or
 * `LOBSTERD_CONFIG_PATH` if set).
 *
 * This file holds the long-lived agent JWT minted by the cloud server
 * during pairing, plus the relay URL to reach. It does NOT contain the
 * relay JWT secret — only the cloud server can mint new agent tokens.
 */

import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface LobsterdConfig {
  lobsterId: string;
  cloudUrl: string;
  relayUrl: string;
  pairingToken: string;
  agentJwt: string;
  publicKey: string;
  /** Local SSH endpoint to forward to. Default: 127.0.0.1:22. */
  sshHost: string;
  sshPort: number;
}

export function configPath(): string {
  return (
    process.env.LOBSTERD_CONFIG_PATH ??
    join(homedir(), ".lobsterd", "config.json")
  );
}

export async function readConfig(): Promise<LobsterdConfig | null> {
  try {
    const buf = await fs.readFile(configPath(), "utf-8");
    return JSON.parse(buf) as LobsterdConfig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeConfig(cfg: LobsterdConfig): Promise<void> {
  const path = configPath();
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, JSON.stringify(cfg, null, 2) + "\n", {
    mode: 0o600,
  });
}
