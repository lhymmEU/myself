import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  reorderFolders,
} from "@/lib/modules/plans/actions";

export async function GET() {
  bootApp();
  try {
    const folders = listFolders();
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
  try {
    const body = await req.json();
    const folder = createFolder(body.name ?? "Untitled Folder");
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
  try {
    const body = await req.json();
    if (body.action === "reorder" && Array.isArray(body.ids)) {
      reorderFolders(body.ids);
      return NextResponse.json({ success: true });
    }
    if (body.id && body.name) {
      renameFolder(body.id, body.name);
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
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    deleteFolder(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
