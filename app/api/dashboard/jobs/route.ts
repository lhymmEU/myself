import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listAssignedJobs,
  createAssignedJob,
  updateAssignedJob,
  deleteAssignedJob,
} from "@/lib/modules/dashboard/actions";

export async function GET() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const jobs = listAssignedJobs(auth.userId);
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list jobs" },
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
      const result = createAssignedJob(body, auth.userId);
      return NextResponse.json(result);
    }

    if (action === "update") {
      updateAssignedJob(body.id, body.data, auth.userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      deleteAssignedJob(body.id, auth.userId);
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
