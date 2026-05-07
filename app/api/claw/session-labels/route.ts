import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getClawConnection } from "@/lib/claw/db";
import {
  getSessionLabelMap,
  setSessionLabel,
} from "@/lib/claw/session-labels";

bootApp();

const putSchema = z.object({
  connectionId: z.string().min(1),
  sessionKey: z.string().min(1),
  /** `null` or `""` removes the custom name */
  label: z.union([z.string(), z.null()]),
});

export async function PUT(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const conn = await getClawConnection(parsed.data.connectionId, auth.userId);
  if (!conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const labels = await setSessionLabel(
    conn.id,
    parsed.data.sessionKey,
    parsed.data.label,
    auth.userId,
  );

  return NextResponse.json({ labels });
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  const connectionId = req.nextUrl.searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json(
      { error: "Missing connectionId" },
      { status: 400 },
    );
  }

  const conn = await getClawConnection(connectionId, auth.userId);
  if (!conn) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const labels = await getSessionLabelMap(conn.id, auth.userId);
  return NextResponse.json({ labels });
}
