import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getOrCreateDefaultScene,
  getScene,
  getAllScenes,
  createScene,
  updateScene,
  deleteScene,
  getTodoSourceScene,
  setTodoSource,
} from "@/lib/modules/mind-map/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const scene = await getScene(id, userId);
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    return NextResponse.json(scene);
  }

  const todoSource = searchParams.get("todoSource");
  if (todoSource === "true") {
    const scene = await getTodoSourceScene(userId);
    if (!scene) {
      return NextResponse.json({ error: "No todo source set" }, { status: 404 });
    }
    return NextResponse.json(scene);
  }

  const listAll = searchParams.get("all");
  if (listAll === "true") {
    const mode = searchParams.get("mode") as "mind" | "product" | null;
    return NextResponse.json(await getAllScenes(mode ?? undefined, userId));
  }

  const scene = await getOrCreateDefaultScene(userId);
  return NextResponse.json(scene);
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const scene = await createScene(
    {
      name: body.name,
      elements: body.elements,
      appState: body.appState,
      files: body.files,
      mode: body.mode,
    },
    undefined,
    auth.userId,
  );
  return NextResponse.json(scene, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  if (body.isTodoSource !== undefined) {
    const scene = await setTodoSource(body.id, body.isTodoSource, userId);
    return NextResponse.json(scene);
  }

  const scene = await updateScene(
    {
      id: body.id,
      name: body.name,
      elements: body.elements,
      appState: body.appState,
      files: body.files,
    },
    userId,
  );
  return NextResponse.json(scene);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteScene(id, auth.userId);
  return NextResponse.json({ success: true });
}
