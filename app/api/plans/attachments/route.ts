import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listPlanAttachments,
  attachMarkedItem,
  detachMarkedItem,
  reorderPlanAttachments,
} from "@/lib/modules/plans/attachments";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const planId = req.nextUrl.searchParams.get("planId");
    if (!planId) {
      return NextResponse.json({ error: "Missing planId" }, { status: 400 });
    }
    const items = await listPlanAttachments(planId, auth.userId);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    if (!body.planId || !body.markedItemId) {
      return NextResponse.json(
        { error: "Missing planId or markedItemId" },
        { status: 400 },
      );
    }
    const result = await attachMarkedItem(
      { planId: body.planId, markedItemId: body.markedItemId },
      auth.userId,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    if (body.action !== "reorder" || !body.planId || !Array.isArray(body.ids)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    await reorderPlanAttachments(body.planId, body.ids, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const planId = req.nextUrl.searchParams.get("planId");
    const markedItemId = req.nextUrl.searchParams.get("markedItemId");
    if (!planId || !markedItemId) {
      return NextResponse.json(
        { error: "Missing planId or markedItemId" },
        { status: 400 },
      );
    }
    await detachMarkedItem({ planId, markedItemId }, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 },
    );
  }
}
