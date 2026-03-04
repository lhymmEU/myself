import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
} from "@/lib/modules/plans/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    const id = req.nextUrl.searchParams.get("id");

    if (action === "list" || (!action && !id)) {
      return NextResponse.json(getAllPlans());
    }

    if (id) {
      const plan = getPlan(id);
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
  try {
    const body = await req.json();
    const plan = createPlan({
      title: body.title,
      content: body.content,
      linkedNodeId: body.linkedNodeId,
    });
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
  try {
    const body = await req.json();
    const plan = updatePlan({
      id: body.id,
      title: body.title,
      content: body.content,
      linkedNodeId: body.linkedNodeId,
    });
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
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    deletePlan(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
