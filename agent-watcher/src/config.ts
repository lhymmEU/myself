import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export const CONFIG_DIR = path.join(os.homedir(), ".myself-op");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface WatcherConfig {
  supabaseUrl: string;
  /** Public anon/publishable key — required as `apikey` header by PostgREST. */
  anonKey: string;
  userId: string;
  /** Agent JWT — sent in `Authorization: Bearer ...` for per-user RLS. */
  token: string;
  /** Optional override; defaults to "openclaw" on PATH. */
  agentCmd?: string;
}

export async function readConfig(): Promise<WatcherConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(CONFIG_PATH, "utf8");
  } catch {
    throw new Error(
      `Config not found at ${CONFIG_PATH}. Run \`node myself-op.js init\` first.`,
    );
  }
  const cfg = JSON.parse(raw) as Partial<WatcherConfig>;
  if (!cfg.supabaseUrl || !cfg.anonKey || !cfg.userId || !cfg.token) {
    throw new Error(`Config at ${CONFIG_PATH} is missing required fields.`);
  }
  return cfg as WatcherConfig;
}

export async function writeConfig(cfg: WatcherConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), { mode: 0o600 });
}

/**
 * Decode the payload of a JWT without verifying the signature — Supabase
 * does signature verification on every request. We only need the claims
 * client-side to extract the user id and confirm it's an agent token.
 */
export function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token is not a valid JWT (expected three dot-separated parts).");
  }
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}
