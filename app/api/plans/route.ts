import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getAllPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  reorderPlans,
} from "@/lib/modules/plans/actions";

export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const action = req.nextUrl.searchParams.get("action");
    const id = req.nextUrl.searchParams.get("id");

    if (action === "list" || (!action && !id)) {
      return NextResponse.json(await getAllPlans(auth.userId));
    }

    if (id) {
      const plan = await getPlan(id, auth.userId);
      if (!plan) {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 });
      }
      return NextResponse.json(plan);
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const plan = await createPlan(
      {
        title: body.title,
        content: body.content,
        linkedNodeId: body.linkedNodeId,
        folderId: body.folderId,
      },
      auth.userId,
    );
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    if (body.action === "reorder" && Array.isArray(body.ids)) {
      await reorderPlans(body.ids, auth.userId);
      return NextResponse.json({ success: true });
    }
    const plan = await updatePlan(
      {
        id: body.id,
        title: body.title,
        content: body.content,
        linkedNodeId: body.linkedNodeId,
        folderId: body.folderId,
      },
      auth.userId,
    );
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deletePlan(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
