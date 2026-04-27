import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  reorderFolders,
} from "@/lib/modules/plans/actions";

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const folders = await listFolders(auth.userId);
    return NextResponse.json({ folders });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const folder = await createFolder(body.name ?? "Untitled Folder", auth.userId);
    return NextResponse.json(folder);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    if (body.action === "reorder" && Array.isArray(body.ids)) {
      await reorderFolders(body.ids, auth.userId);
      return NextResponse.json({ success: true });
    }
    if (body.id && body.name) {
      await renameFolder(body.id, body.name, auth.userId);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteFolder(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
