import { NextRequest, NextResponse } from "next/server";
import {
  listAssignedJobs,
  createAssignedJob,
  updateAssignedJob,
  deleteAssignedJob,
} from "@/lib/modules/dashboard/actions";

export async function GET() {
  try {
    const jobs = listAssignedJobs();
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const result = createAssignedJob(body);
      return NextResponse.json(result);
    }

    if (action === "update") {
      updateAssignedJob(body.id, body.data);
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      deleteAssignedJob(body.id);
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
