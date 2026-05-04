import { nanoid } from "nanoid";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import { planMarkedAttachments } from "./schema";
import { markedItems } from "@/lib/db/schema/sqlite/marked";
import type { MarkedItem } from "@/lib/modules/marked/types";
import type { PlanAttachedItem } from "./types";

function normalizeMarkedItem(row: typeof markedItems.$inferSelect): MarkedItem {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function listPlanAttachments(
  planId: string,
  userId: string = LOCAL_USER_ID,
): Promise<PlanAttachedItem[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(planMarkedAttachments)
    .where(
      and(
        eq(planMarkedAttachments.planId, planId),
        eq(planMarkedAttachments.userId, userId),
      ),
    )
    .orderBy(asc(planMarkedAttachments.sortOrder));

  if (rows.length === 0) return [];

  const itemIds = rows.map((r) => r.markedItemId);
  const itemRows = await db
    .select()
    .from(markedItems)
    .where(
      and(eq(markedItems.userId, userId), inArray(markedItems.id, itemIds)),
    );

  const byId = new Map(
    itemRows.map((r) => [r.id, normalizeMarkedItem(r)] as const),
  );

  return rows
    .map((r) => {
      const item = byId.get(r.markedItemId);
      if (!item) return null;
      return {
        ...item,
        attachmentId: r.id,
        attachmentSortOrder: Number(r.sortOrder),
        attachedAt: Number(r.createdAt),
      } satisfies PlanAttachedItem;
    })
    .filter((x): x is PlanAttachedItem => x !== null);
}

/**
 * Attach a marked item to a plan. Idempotent — re-attaching the same pair
 * is a no-op and returns the existing row.
 */
export async function attachMarkedItem(
  input: { planId: string; markedItemId: string },
  userId: string = LOCAL_USER_ID,
): Promise<{ id: string; created: boolean }> {
  const db = getDb();
  const existing = await db
    .select()
    .from(planMarkedAttachments)
    .where(
      and(
        eq(planMarkedAttachments.planId, input.planId),
        eq(planMarkedAttachments.markedItemId, input.markedItemId),
        eq(planMarkedAttachments.userId, userId),
      ),
    )
    .limit(1);

  if (existing[0]) return { id: existing[0].id, created: false };

  const maxRows = await db
    .select({
      max: sql<number>`COALESCE(MAX(${planMarkedAttachments.sortOrder}), -1)`,
    })
    .from(planMarkedAttachments)
    .where(
      and(
        eq(planMarkedAttachments.planId, input.planId),
        eq(planMarkedAttachments.userId, userId),
      ),
    );
  const sortOrder = Number(maxRows[0]?.max ?? -1) + 1;

  const id = nanoid();
  await db.insert(planMarkedAttachments).values({
    id,
    userId,
    planId: input.planId,
    markedItemId: input.markedItemId,
    sortOrder,
    createdAt: Date.now(),
  });
  return { id, created: true };
}

export async function detachMarkedItem(
  input: { planId: string; markedItemId: string },
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(planMarkedAttachments)
    .where(
      and(
        eq(planMarkedAttachments.planId, input.planId),
        eq(planMarkedAttachments.markedItemId, input.markedItemId),
        eq(planMarkedAttachments.userId, userId),
      ),
    );
}

export async function reorderPlanAttachments(
  planId: string,
  ids: string[],
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  for (let index = 0; index < ids.length; index++) {
    const id = ids[index];
    await db
      .update(planMarkedAttachments)
      .set({ sortOrder: index })
      .where(
        and(
          eq(planMarkedAttachments.id, id),
          eq(planMarkedAttachments.planId, planId),
          eq(planMarkedAttachments.userId, userId),
        ),
      );
  }
}

/** Used by deletePlan() to keep the join table tidy. */
export async function deleteAttachmentsForPlan(
  planId: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const db = getDb();
  await db
    .delete(planMarkedAttachments)
    .where(
      and(
        eq(planMarkedAttachments.planId, planId),
        eq(planMarkedAttachments.userId, userId),
      ),
    );
}
