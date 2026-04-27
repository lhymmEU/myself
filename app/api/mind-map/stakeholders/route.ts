import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getAllStakeholders,
  getStakeholder,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const stakeholder = getStakeholder(id, auth.userId);
    if (!stakeholder) {
      return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 });
    }
    return NextResponse.json(stakeholder);
  }

  return NextResponse.json(getAllStakeholders(auth.userId));
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const stakeholder = createStakeholder(body, auth.userId);
  return NextResponse.json(stakeholder, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const stakeholder = updateStakeholder(body, auth.userId);
  return NextResponse.json(stakeholder);
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
  deleteStakeholder(id, auth.userId);
  return NextResponse.json({ success: true });
}
