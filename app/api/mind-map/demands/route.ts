import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllDemands,
  getDemand,
  createDemand,
  updateDemand,
  deleteDemand,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const demand = getDemand(id);
    if (!demand) {
      return NextResponse.json({ error: "Demand not found" }, { status: 404 });
    }
    return NextResponse.json(demand);
  }

  return NextResponse.json(getAllDemands());
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }
  const demand = createDemand(body);
  return NextResponse.json(demand, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const demand = updateDemand(body);
  return NextResponse.json(demand);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteDemand(id);
  return NextResponse.json({ success: true });
}
