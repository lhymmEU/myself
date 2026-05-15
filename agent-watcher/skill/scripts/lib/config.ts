import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export const CONFIG_PATH = path.join(os.homedir(), ".myself-op", "config.json");

export const WIKI_ROOT = path.join(os.homedir(), ".myself-op", "wiki");

export interface SkillConfig {
  supabaseUrl: string;
  userId: string;
  token: string;
}

export async function loadConfig(): Promise<SkillConfig> {
  let raw: string;
  try {
    raw = await fs.readFile(CONFIG_PATH, "utf8");
  } catch {
    throw new Error(
      `Missing config at ${CONFIG_PATH}. Run \`node myself-op.js init\` on this machine first.`,
    );
  }
  const cfg = JSON.parse(raw) as Partial<SkillConfig>;
  if (!cfg.supabaseUrl || !cfg.userId || !cfg.token) {
    throw new Error(`Config at ${CONFIG_PATH} is missing required fields.`);
  }
  return cfg as SkillConfig;
}
