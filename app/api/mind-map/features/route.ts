import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllFeatures,
  getFeature,
  createFeature,
  updateFeature,
  deleteFeature,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const feature = getFeature(id);
    if (!feature) {
      return NextResponse.json({ error: "Feature not found" }, { status: 404 });
    }
    return NextResponse.json(feature);
  }

  return NextResponse.json(getAllFeatures());
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const feature = createFeature(body);
  return NextResponse.json(feature, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const feature = updateFeature(body);
  return NextResponse.json(feature);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteFeature(id);
  return NextResponse.json({ success: true });
}
