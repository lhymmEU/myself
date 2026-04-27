import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

async function resolveConnectionId(
  req: NextRequest,
  userId: string,
): Promise<string | null> {
  return (
    req.nextUrl.searchParams.get("connectionId") ??
    (await getDefaultConnection(userId))?.id ??
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
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const connectionId = await resolveConnectionId(req, auth.userId);
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
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const connectionId =
      body.connectionId ?? (await getDefaultConnection(auth.userId))?.id;
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
      `mkdir -p "${safePath}" && cat > "${safePath}SKILL.md" << 'OPENCLAW_SKILL_EOF'\n${escaped}\nOPENCLAW_SKILL_EOF`,
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
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const connectionId =
      body.connectionId ?? (await getDefaultConnection(auth.userId))?.id;
    const err = guard(connectionId);
    if (err) return err;

    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();

    const template = `---
name: ${name}
description: A custom skill
---

# ${name}

Describe what this skill does here.
`;

    const escaped = template.replace(/'/g, "'\\''");
    // Use $HOME instead of ~ so it expands inside double quotes
    const result = await executeCommand(
      connectionId!,
      `SKILL_DIR="$HOME/.openclaw/workspace/skills/${safeName}/" && mkdir -p "$SKILL_DIR" && cat > "$SKILL_DIR"SKILL.md << 'OPENCLAW_SKILL_EOF'\n${escaped}\nOPENCLAW_SKILL_EOF`,
      10000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: result.stderr || "Failed to create skill" },
        { status: 500 }
      );
    }

    // Return the resolved path using $HOME expansion
    const pathResult = await executeCommand(
      connectionId!,
      `echo "$HOME/.openclaw/workspace/skills/${safeName}/"`,
      5000
    );
    const resolvedPath = pathResult.stdout.trim() || `$HOME/.openclaw/workspace/skills/${safeName}/`;

    return NextResponse.json({ success: true, path: resolvedPath });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
