import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

function resolveConnectionId(req: NextRequest): string | null {
  return (
    req.nextUrl.searchParams.get("connectionId") ??
    getDefaultConnection()?.id ??
    null
  );
}

function guard(connectionId: string | null) {
  if (!connectionId)
    return NextResponse.json({ error: "No connection configured" }, { status: 400 });
  if (!isSSHConnected(connectionId))
    return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
  return null;
}

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const connectionId = resolveConnectionId(req);
    const err = guard(connectionId);
    if (err) return err;

    const skillPath = req.nextUrl.searchParams.get("path");
    if (!skillPath) {
      return NextResponse.json({ error: "path parameter required" }, { status: 400 });
    }

    const safePath = skillPath.replace(/[`$]/g, "");
    const result = await executeCommand(
      connectionId!,
      `cat "${safePath}SKILL.md" 2>/dev/null || echo ''`,
      10000
    );

    return NextResponse.json({ content: result.stdout, code: result.code });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const connectionId = body.connectionId ?? getDefaultConnection()?.id;
    const err = guard(connectionId);
    if (err) return err;

    const { path: skillPath, content } = body;
    if (!skillPath || content === undefined) {
      return NextResponse.json({ error: "path and content required" }, { status: 400 });
    }

    const safePath = skillPath.replace(/[`$]/g, "");
    const escaped = content.replace(/'/g, "'\\''");
    const result = await executeCommand(
      connectionId!,
      `cat > "${safePath}SKILL.md" << 'OPENCLAW_SKILL_EOF'\n${escaped}\nOPENCLAW_SKILL_EOF`,
      10000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.stderr || "Failed to write SKILL.md" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const connectionId = body.connectionId ?? getDefaultConnection()?.id;
    const err = guard(connectionId);
    if (err) return err;

    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
    const skillDir = `~/.openclaw/skills/${safeName}/`;

    const template = `---
name: ${name}
description: A custom skill
---

# ${name}

Describe what this skill does here.
`;

    const escaped = template.replace(/'/g, "'\\''");
    const result = await executeCommand(
      connectionId!,
      `mkdir -p "${skillDir}" && cat > "${skillDir}SKILL.md" << 'OPENCLAW_SKILL_EOF'\n${escaped}\nOPENCLAW_SKILL_EOF`,
      10000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.stderr || "Failed to create skill" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, path: skillDir });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
