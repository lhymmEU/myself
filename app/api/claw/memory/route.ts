import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  executeOpenClawCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

function resolveConnectionId(req: NextRequest, userId: string): string | null {
  return (
    req.nextUrl.searchParams.get("connectionId") ??
    getDefaultConnection(userId)?.id ??
    null
  );
}

function guardConnection(connectionId: string | null) {
  if (!connectionId) {
    return NextResponse.json({ error: "No connection configured" }, { status: 400 });
  }
  if (!isSSHConnected(connectionId)) {
    return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const connectionId = resolveConnectionId(req, auth.userId);
    const err = guardConnection(connectionId);
    if (err) return err;

    const action = req.nextUrl.searchParams.get("action") ?? "list";
    const file = req.nextUrl.searchParams.get("file");

    if (action === "read" && file) {
      const safePath = file.replace(/[^a-zA-Z0-9._\-/]/g, "");
      const result = await executeCommand(
        connectionId!,
        `cat ~/.openclaw/workspace/${safePath} 2>/dev/null || echo ''`,
        10000
      );
      return NextResponse.json({ content: result.stdout, code: result.code });
    }

    if (action === "status") {
      const result = await executeOpenClawCommand(connectionId!, "memory status --deep", 15000);
      return NextResponse.json({
        status: result.stdout.trim(),
        code: result.code,
        error: result.code !== 0 ? result.stderr : undefined,
      });
    }

    const listResult = await executeCommand(
      connectionId!,
      `ls -1 ~/.openclaw/workspace/memory/ 2>/dev/null | sort -r | head -50`,
      10000
    );

    const files = listResult.stdout
      .trim()
      .split("\n")
      .filter((f) => f.endsWith(".md"))
      .map((name) => {
        const dateMatch = name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
        return {
          path: `memory/${name}`,
          name,
          date: dateMatch ? dateMatch[1] : undefined,
        };
      });

    const memoryMdResult = await executeCommand(
      connectionId!,
      `test -f ~/.openclaw/workspace/MEMORY.md && echo "exists" || echo "missing"`,
      5000
    );
    const hasMemoryMd = memoryMdResult.stdout.trim() === "exists";

    return NextResponse.json({ files, hasMemoryMd });
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
      body.connectionId ?? getDefaultConnection(auth.userId)?.id;
    const err = guardConnection(connectionId);
    if (err) return err;

    const { action } = body;

    if (action === "search") {
      const query = body.query ?? "";
      const escaped = query.replace(/"/g, '\\"');
      const result = await executeOpenClawCommand(
        connectionId!,
        `memory search "${escaped}"`,
        15000
      );
      return NextResponse.json({
        results: result.stdout.trim(),
        code: result.code,
        error: result.code !== 0 ? result.stderr : undefined,
      });
    }

    if (action === "write") {
      const { file, content } = body;
      if (!file || content === undefined) {
        return NextResponse.json({ error: "file and content required" }, { status: 400 });
      }

      const safePath = file.replace(/[^a-zA-Z0-9._\-/]/g, "");
      const escaped = content.replace(/'/g, "'\\''");
      const result = await executeCommand(
        connectionId!,
        `mkdir -p ~/.openclaw/workspace/memory && cat > ~/.openclaw/workspace/${safePath} << 'OPENCLAW_EOF'\n${escaped}\nOPENCLAW_EOF`,
        10000
      );

      if (result.code !== 0) {
        return NextResponse.json(
          { error: result.stderr || "Failed to write" },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
