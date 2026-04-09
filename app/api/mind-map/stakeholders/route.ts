import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllStakeholders,
  getStakeholder,
  createStakeholder,
  updateStakeholder,
  deleteStakeholder,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const stakeholder = getStakeholder(id);
    if (!stakeholder) {
      return NextResponse.json({ error: "Stakeholder not found" }, { status: 404 });
    }
    return NextResponse.json(stakeholder);
  }

  return NextResponse.json(getAllStakeholders());
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const stakeholder = createStakeholder(body);
  return NextResponse.json(stakeholder, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const stakeholder = updateStakeholder(body);
  return NextResponse.json(stakeholder);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteStakeholder(id);
  return NextResponse.json({ success: true });
}
