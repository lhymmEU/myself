import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  getAllHabits,
  createHabit,
  deleteHabit,
  logCompletion,
  getHabitStreaks,
} from "@/lib/modules/habits/actions";

export async function GET(req: NextRequest) {
  bootApp();
  try {
    const action = req.nextUrl.searchParams.get("action");
    if (action === "streaks") {
      const streaks = getHabitStreaks();
      return NextResponse.json(
        streaks.map((s) => ({
          id: s.habit.id,
          name: s.habit.name,
          streak: s.streak,
          frequency: s.habit.frequency,
        }))
      );
    }
    const habits = getAllHabits();
    return NextResponse.json(habits);
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
    const habit = createHabit({
      name: body.name,
      frequency: body.frequency,
    });
    return NextResponse.json(habit);
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
    deleteHabit(id);
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
    const habit = logCompletion(body.id, body.date);
    return NextResponse.json(habit);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 }
    );
  }
}
