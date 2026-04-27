import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";
import type { InstalledSkill } from "@/lib/modules/claw/types";

function parseSkillFrontmatter(raw: string): { name: string; description: string; metadata?: Record<string, unknown> } {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: "", description: "" };

  const fm = fmMatch[1];
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);

  let metadata: Record<string, unknown> | undefined;
  const metaMatch = fm.match(/^metadata:\s*(.+)$/m);
  if (metaMatch) {
    try {
      metadata = JSON.parse(metaMatch[1]);
    } catch {
      // ignore parse errors
    }
  }

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    metadata,
  };
}

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const connectionId =
      req.nextUrl.searchParams.get("connectionId") ??
      (await getDefaultConnection(auth.userId))?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    // Scan all known skill install locations:
    //   ~/.openclaw/skills/        — managed/local skills
    //   ~/skills/                  — workspace skills (home)
    //   ./skills/                  — CWD workspace skills (clawhub default)
    //   ~/.openclaw/workspace/skills/ — openclaw workspace skills
    const script = `
seen=""
scan_dir() {
  local base="$1"
  [ -d "$base" ] || return
  for dir in "$base"/*/; do
    [ -f "\${dir}SKILL.md" ] || continue
    real=\$(cd "$dir" 2>/dev/null && pwd)
    case "$seen" in *"|$real|"*) continue ;; esac
    seen="$seen|$real|"
    echo "===SKILL_ENTRY==="
    echo "PATH:\${dir}"
    head -30 "\${dir}SKILL.md"
  done
}
scan_dir "$HOME/.openclaw/skills"
scan_dir ~/.openclaw/skills
scan_dir ~/skills
scan_dir "$HOME/skills"
scan_dir ./skills
scan_dir ~/.openclaw/workspace/skills
scan_dir "$HOME/.openclaw/workspace/skills"
`.trim();

    const result = await executeCommand(connectionId, script, 15000);

    const skills: InstalledSkill[] = [];
    const entries = result.stdout.split("===SKILL_ENTRY===").filter(Boolean);

    for (const entry of entries) {
      const lines = entry.trim().split("\n");
      const pathLine = lines.find((l) => l.startsWith("PATH:"));
      const skillPath = pathLine?.replace("PATH:", "").trim() ?? "";
      const content = lines.filter((l) => !l.startsWith("PATH:")).join("\n");
      const { name, description, metadata } = parseSkillFrontmatter(content);

      if (name || skillPath) {
        const dirName = skillPath.replace(/\/$/, "").split("/").pop() ?? "";
        skills.push({
          name: name || dirName,
          description,
          path: skillPath,
          metadata,
        });
      }
    }

    return NextResponse.json({ skills });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
