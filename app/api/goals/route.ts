import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  completeMilestone,
} from "@/lib/modules/goals/actions";

export async function GET() {
  bootApp();
  try {
    const goals = getAllGoals();
    return NextResponse.json(goals);
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
    const goal = createGoal({
      title: body.title,
      targetDate: body.targetDate,
      milestones: body.milestones,
    });
    return NextResponse.json(goal);
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
    const goal = updateGoal(body);
    return NextResponse.json(goal);
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
    deleteGoal(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  bootApp();
  try {
    const body = await req.json();
    const goal = completeMilestone(body.goalId, body.milestoneIndex);
    return NextResponse.json(goal);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
