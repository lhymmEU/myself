import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/core/route-helpers";
import { getDb } from "@/lib/db";
import { planPages } from "@/lib/db/schema/postgres/plans";
import { markedItems } from "@/lib/db/schema/postgres/marked";
import { userWishes } from "@/lib/db/schema/postgres/dashboard";
import { emitEvent } from "@/lib/modules/agent/emit";

/**
 * Enumerate the user's existing content and push one event per item.
 * This is the "I just connected my agent — go build the wiki from
 * everything I already have" flow. Strictly serial per user, so the agent
 * will process these in `created_at` order on its next invocation.
 *
 * Emits, in order:
 *   - bootstrap.full   (marker)
 *   - wish.upsert      (one per row)
 *   - page.upsert      (one per row)
 *   - marked.upsert    (one per row)
 *   - regen.cards      (so the agent regenerates cards once everything is in)
 */
export async function POST() {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const userId = auth.userId;
  const db = getDb();

  await emitEvent({
    userId,
    eventType: "bootstrap.full",
    payload: { startedAt: Date.now() },
  });

  let wishCount = 0;
  let pageCount = 0;
  let markedCount = 0;

  const wishes = await db
    .select()
    .from(userWishes)
    .where(eq(userWishes.userId, userId));
  for (const w of wishes) {
    await emitEvent({
      userId,
      eventType: "wish.upsert",
      payload: w,
      sourceRef: { table: "user_wishes", id: w.id },
    });
    wishCount++;
  }

  const pages = await db
    .select()
    .from(planPages)
    .where(eq(planPages.userId, userId));
  for (const p of pages) {
    await emitEvent({
      userId,
      eventType: "page.upsert",
      payload: p,
      sourceRef: { table: "plan_pages", id: p.id },
    });
    pageCount++;
  }

  const items = await db
    .select()
    .from(markedItems)
    .where(eq(markedItems.userId, userId));
  for (const m of items) {
    await emitEvent({
      userId,
      eventType: "marked.upsert",
      payload: m,
      sourceRef: { table: "marked_items", id: m.id },
    });
    markedCount++;
  }

  await emitEvent({
    userId,
    eventType: "regen.cards",
    payload: { reason: "bootstrap complete" },
  });

  return NextResponse.json({
    enqueued: {
      "bootstrap.full": 1,
      "wish.upsert": wishCount,
      "page.upsert": pageCount,
      "marked.upsert": markedCount,
      "regen.cards": 1,
    },
  });
}
