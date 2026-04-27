import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  createInvestment,
  deleteInvestment,
  getInvestments,
  updateInvestment,
} from "@/lib/modules/finance/personal-actions";

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const result = await getInvestments(auth.userId);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const result = await createInvestment(body, auth.userId);
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const body = await req.json();
  const { id, ...data } = body as { id: string } & Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await updateInvestment(id, data, auth.userId);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteInvestment(id, auth.userId);
  return NextResponse.json({ success: true });
}
