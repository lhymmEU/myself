import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listUserSkills,
  createUserSkill,
  updateUserSkill,
  deleteUserSkill,
} from "@/lib/modules/dashboard/actions";

export async function GET() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const skills = listUserSkills(auth.userId);
    return NextResponse.json({ skills });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list skills" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const result = createUserSkill(body, auth.userId);
      return NextResponse.json(result);
    }

    if (action === "update") {
      updateUserSkill(body.id, body.data, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      deleteUserSkill(body.id, auth.userId);
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
