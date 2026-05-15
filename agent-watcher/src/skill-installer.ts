import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { SKILL_ASSETS } from "./generated/assets";

/**
 * The skill is a plain directory of scripts + SKILL.md that the agent
 * reads by absolute path (openclaw does not auto-register skill manifests
 * the way Claude Code does). We co-locate it with the watcher's config and
 * wiki under `~/.myself-op/` so the agent only has to know one root.
 */
export function skillTargetPath(): string {
  return (
    process.env.MYSELF_OP_SKILL_DIR ??
    path.join(os.homedir(), ".myself-op", "skill")
  );
}

/**
 * Decode embedded assets and write them under `skillTargetPath()` (default
 * `~/.myself-op/skill/`). Overwrites existing files so re-running `init`
 * always pins the bundle version that came with this watcher binary.
 *
 * Also scaffolds `~/.myself-op/wiki/INDEX.md` if missing — the SKILL.md
 * workflow tries to read INDEX.md as step 2, and we don't want the agent
 * to fail with ENOENT on its first run before any events have been
 * processed.
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

  await scaffoldEmptyWiki();

  return { target, fileCount: count };
}

async function scaffoldEmptyWiki(): Promise<void> {
  const wikiRoot = path.join(os.homedir(), ".myself-op", "wiki");
  await fs.mkdir(wikiRoot, { recursive: true });
  const indexPath = path.join(wikiRoot, "INDEX.md");
  try {
    await fs.access(indexPath);
    return; // already exists — don't overwrite the agent's curated index
  } catch {
    // not yet — create a minimal placeholder
  }
  const body = [
    "# Wiki — empty",
    "",
    "This wiki has no content yet. On your next invocation, drain the event",
    "queue, populate `wishes/`, `plans/`, `references/`, etc. per SKILL.md,",
    "and rewrite this INDEX.md to reflect the new layout.",
    "",
  ].join("\n");
  await fs.writeFile(indexPath, body);
  const changelogPath = path.join(wikiRoot, "changelog.md");
  try {
    await fs.access(changelogPath);
  } catch {
    await fs.writeFile(changelogPath, "");
  }
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
