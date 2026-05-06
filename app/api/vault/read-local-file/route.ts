import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { basename, resolve } from "path";
import { homedir } from "os";
import { requireUserId } from "@/lib/core/route-helpers";
import { isLocal } from "@/lib/core/runtime";

const MAX_FILE_SIZE = 64 * 1024; // 64 KB

function expandHome(filePath: string): string {
  if (filePath.startsWith("~/") || filePath === "~") {
    return resolve(homedir(), filePath.slice(2));
  }
  return resolve(filePath);
}

export async function POST(req: NextRequest) {
  if (!isLocal()) {
    return NextResponse.json(
      { error: "Reading local files is only available in local mode" },
      { status: 403 }
    );
  }
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const { path: rawPath } = await req.json();
    if (!rawPath || typeof rawPath !== "string") {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const filePath = expandHome(rawPath.trim());

    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      return NextResponse.json(
        { error: "File not found or not a regular file" },
        { status: 404 }
      );
    }

    if (info.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 64 KB)" },
        { status: 400 }
      );
    }

    const contents = await readFile(filePath, "utf-8");
    return NextResponse.json({ contents, fileName: basename(filePath) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read file" },
      { status: 500 }
    );
  }
}
