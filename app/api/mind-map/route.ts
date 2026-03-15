import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getOrCreateDefaultScene,
  getScene,
  getAllScenes,
  createScene,
  updateScene,
  deleteScene,
} from "@/lib/modules/mind-map/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const scene = getScene(id);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json(scene);
  }

  const listAll = searchParams.get("all");
  if (listAll === "true") {
    const mode = searchParams.get("mode") as "mind" | "product" | null;
    return NextResponse.json(getAllScenes(mode ?? undefined));
  }

  const scene = getOrCreateDefaultScene();
  return NextResponse.json(scene);
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  const scene = createScene({
    name: body.name,
    elements: body.elements,
    appState: body.appState,
    files: body.files,
    mode: body.mode,
  });
  return NextResponse.json(scene, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const scene = updateScene({
    id: body.id,
    name: body.name,
    elements: body.elements,
    appState: body.appState,
    files: body.files,
  });
  return NextResponse.json(scene);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteScene(id);
  return NextResponse.json({ success: true });
}
