import { NextRequest, NextResponse } from "next/server";
import {
  listUserSkills,
  createUserSkill,
  updateUserSkill,
  deleteUserSkill,
} from "@/lib/modules/dashboard/actions";

export async function GET() {
  try {
    const skills = listUserSkills();
    return NextResponse.json({ skills });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list skills" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const result = createUserSkill(body);
      return NextResponse.json(result);
    }

    if (action === "update") {
      updateUserSkill(body.id, body.data);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      deleteUserSkill(body.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
