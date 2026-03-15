import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllUserProfiles,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const profile = getUserProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  return NextResponse.json(getAllUserProfiles());
}

export async function POST(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const profile = createUserProfile(body);
  return NextResponse.json(profile, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const profile = updateUserProfile(body);
  return NextResponse.json(profile);
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  deleteUserProfile(id);
  return NextResponse.json({ success: true });
}
