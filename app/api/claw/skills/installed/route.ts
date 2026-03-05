import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
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
  try {
    const connectionId =
      req.nextUrl.searchParams.get("connectionId") ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    // Read managed/local skills + workspace skills in one batch
    // Each skill dir has a SKILL.md; print a delimiter between entries
    const script = `
for dir in ~/.openclaw/skills/*/; do
  [ -f "\${dir}SKILL.md" ] || continue
  echo "===SKILL_ENTRY==="
  echo "PATH:\${dir}"
  head -30 "\${dir}SKILL.md"
done
for dir in ~/skills/*/; do
  [ -f "\${dir}SKILL.md" ] || continue
  echo "===SKILL_ENTRY==="
  echo "PATH:\${dir}"
  head -30 "\${dir}SKILL.md"
done
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
