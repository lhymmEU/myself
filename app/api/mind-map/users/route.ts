import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getAllUserProfiles,
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/modules/mind-map/product-actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const profile = await getUserProfile(id, auth.userId);
    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  }

  return NextResponse.json(await getAllUserProfiles(auth.userId));
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  if (!body.name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const profile = await createUserProfile(body, auth.userId);
  return NextResponse.json(profile, { status: 201 });
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const profile = await updateUserProfile(body, auth.userId);
  return NextResponse.json(profile);
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
  await deleteUserProfile(id, auth.userId);
  return NextResponse.json({ success: true });
}
