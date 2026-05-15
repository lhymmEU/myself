import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { SKILL_ASSETS } from "./generated/assets";

const SKILL_NAME = "myself-op";

function skillsDir(): string {
  return process.env.CLAUDE_SKILLS_DIR ?? path.join(os.homedir(), ".claude", "skills");
}

export function skillTargetPath(): string {
  return path.join(skillsDir(), SKILL_NAME);
}

/**
 * Decode embedded assets and write them under ~/.claude/skills/myself-op/.
 * Overwrites existing files so re-running `init` always pins the bundle
 * version that came with this watcher binary.
 */
export async function installSkill(): Promise<{ target: string; fileCount: number }> {
  const target = skillTargetPath();
  await fs.mkdir(target, { recursive: true });

  let count = 0;
  for (const [relPath, base64] of Object.entries(SKILL_ASSETS)) {
    const dest = path.join(target, relPath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, Buffer.from(base64, "base64"));
    count++;
  }

  return { target, fileCount: count };
}

/**
 * Best-effort `npm install --omit=dev` inside the skill directory. Failure
 * is logged but not fatal — the user can re-run it manually.
 */
export async function installSkillDeps(target: string): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn("npm", ["install", "--omit=dev"], {
      cwd: target,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code !== 0) {
        console.warn(
          `[skill] npm install exited with code ${code}. Run it manually in ${target} if the agent has missing deps.`,
        );
      }
      resolve();
    });
    child.on("error", (err) => {
      console.warn(`[skill] npm install could not start: ${err.message}`);
      resolve();
    });
  });
}
