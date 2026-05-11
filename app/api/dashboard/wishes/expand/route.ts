import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDefaultClawConnection } from "@/lib/claw/db";
import { streamCommand } from "@/lib/claw/ssh";
import { buildOpenclawAgentCommand } from "@/lib/claw/openclaw-agent";
import { WISHLIST_PLAN_SESSION_ID } from "@/lib/claw/constants";
import {
  buildWishlistPlanPreamble,
  extractWishPlanJson,
} from "@/lib/claw/wishlist-plan-preamble";
import { createUserWish } from "@/lib/modules/dashboard/actions";

const bodySchema = z.object({
  category: z.enum(["learn", "place", "goal"]),
  userDescription: z.string().min(1).max(8000),
});

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const connection = await getDefaultClawConnection(auth.userId);
  if (!connection) {
    return NextResponse.json(
      { error: "No claw connection configured" },
      { status: 400 },
    );
  }

  const { category, userDescription } = parsed.data;
  const message = `${buildWishlistPlanPreamble(category)}\n\n${userDescription.trim()}`;
  const command = buildOpenclawAgentCommand({
    message,
    sessionId: WISHLIST_PLAN_SESSION_ID,
    agentTimeoutSec: 120,
  });

  try {
    const iter = streamCommand(connection.id, command, 120_000, auth.userId);
    let result = await iter.next();
    while (!result.done) {
      result = await iter.next();
    }
    const exec = result.value;
    if (exec.code !== 0) {
      return NextResponse.json(
        {
          error: "openclaw_failed",
          detail: exec.stderr?.trim() || `exit code ${exec.code}`,
        },
        { status: 502 },
      );
    }

    const plan = extractWishPlanJson(exec.stdout);
    if (!plan || Object.keys(plan).length === 0) {
      return NextResponse.json(
        {
          error: "invalid_plan_json",
          detail:
            "Agent output did not contain a valid flat JSON object between the wish plan markers.",
        },
        { status: 422 },
      );
    }

    const wish = await createUserWish(
      {
        category,
        userDescription: userDescription.trim(),
        planData: plan,
      },
      auth.userId,
    );

    return NextResponse.json({ wish });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to expand wish",
      },
      { status: 500 },
    );
  }
}
