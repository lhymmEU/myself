import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllNodes,
  createNode,
  updateNode,
  deleteNode,
  connectNodes,
} from "@/lib/modules/mind-map/actions";

export async function GET() {
  bootApp();
  const nodes = getAllNodes();
  return NextResponse.json(nodes);
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  const node = createNode({
    label: body.label,
    type: body.type,
    color: body.color,
    positionX: body.positionX,
    positionY: body.positionY,
    parentId: body.parentId,
  });
  return NextResponse.json(node, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();

  if (body.action === "connect") {
    const node = connectNodes(body.sourceId, body.targetId);
    return NextResponse.json(node);
  }

  const node = updateNode({
    id: body.id,
    label: body.label,
    type: body.type,
    color: body.color,
    positionX: body.positionX,
    positionY: body.positionY,
    connections: body.connections,
    metadata: body.metadata,
  });
  return NextResponse.json(node);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteNode(id);
  return NextResponse.json({ success: true });
}
