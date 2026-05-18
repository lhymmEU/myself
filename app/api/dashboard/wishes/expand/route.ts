import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { createUserWish } from "@/lib/modules/dashboard/actions";
import { getRegistration } from "@/lib/modules/agent/registration";
import { emitEvent } from "@/lib/modules/agent/emit";

const bodySchema = z.object({
  category: z.enum(["learn", "place", "goal"]),
  userDescription: z.string().min(1).max(8000),
});

/**
 * Async wish expansion via the agent-watcher event queue.
 *
 * Creates a placeholder `user_wishes` row with `status: "expanding"`, then
 * pushes a `wish.expand` event for the watcher to drain. The watcher runs
 * openclaw locally, then writes `planData` back to the same row and flips
 * `status` to `"ready"` (or `"error"` on failure). The UI polls the wishes
 * list while any row is still in `expanding`.
 */
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

  const registration = await getRegistration(auth.userId);
  if (!registration.connected) {
    return NextResponse.json(
      {
        error:
          "No agent watcher paired. Pair one under Dashboard → Settings → Agent.",
      },
      { status: 400 },
    );
  }

  const { category, userDescription } = parsed.data;

  const wish = await createUserWish(
    {
      category,
      userDescription: userDescription.trim(),
      planData: {},
      status: "expanding",
    },
    auth.userId,
  );

  await emitEvent({
    userId: auth.userId,
    eventType: "wish.expand",
    payload: {
      wishId: wish.id,
      category,
      userDescription: userDescription.trim(),
    },
    sourceRef: { table: "user_wishes", id: wish.id },
  });

  return NextResponse.json({ wish }, { status: 202 });
}
