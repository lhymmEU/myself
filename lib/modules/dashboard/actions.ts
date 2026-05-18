import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { eventBus } from "@/lib/core/event-bus";
import { userWishes } from "./schema";
import type { WishCategory } from "@/lib/wishlist/types";
import { DASHBOARD_EVENTS } from "./events";

// --- User wishes (learn / places / goals) ---

function normalizeUserWishRow<
  T extends {
    createdAt: number | string;
    updatedAt: number | string;
  },
>(row: T): T {
  return {
    ...row,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function listUserWishes(userId: string) {
  const rows = await getDb()
    .select()
    .from(userWishes)
    .where(eq(userWishes.userId, userId));
  return rows.map(normalizeUserWishRow);
}

export async function createUserWish(
  data: {
    category: WishCategory;
    userDescription: string;
    planData: Record<string, string>;
    status?: "expanding" | "ready" | "error";
  },
  userId: string,
) {
  const id = nanoid();
  const now = Date.now();
  const planJson = JSON.stringify(data.planData);
  await getDb()
    .insert(userWishes)
    .values({
      id,
      userId,
      category: data.category,
      userDescription: data.userDescription.trim(),
      planData: planJson,
      status: data.status ?? "ready",
      createdAt: now,
      updatedAt: now,
    });
  eventBus.emit("dashboard", DASHBOARD_EVENTS.WISH_CREATED, {
    id,
    name: data.userDescription.trim(),
  });
  const rows = await getDb()
    .select()
    .from(userWishes)
    .where(and(eq(userWishes.id, id), eq(userWishes.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) {
    throw new Error("user_wish_insert_failed");
  }
  return normalizeUserWishRow(row);
}

export async function updateUserWishPlanData(
  id: string,
  planData: Record<string, string>,
  userId: string,
): Promise<void> {
  await getDb()
    .update(userWishes)
    .set({
      planData: JSON.stringify(planData),
      updatedAt: Date.now(),
    })
    .where(and(eq(userWishes.id, id), eq(userWishes.userId, userId)));
  eventBus.emit("dashboard", DASHBOARD_EVENTS.WISH_UPDATED, { id });
}

export async function updateUserWishStatus(
  id: string,
  status: "expanding" | "ready" | "error",
  userId: string,
): Promise<void> {
  await getDb()
    .update(userWishes)
    .set({ status, updatedAt: Date.now() })
    .where(and(eq(userWishes.id, id), eq(userWishes.userId, userId)));
}

export async function deleteUserWish(
  id: string,
  userId: string,
): Promise<void> {
  await getDb()
    .delete(userWishes)
    .where(and(eq(userWishes.id, id), eq(userWishes.userId, userId)));
  eventBus.emit("dashboard", DASHBOARD_EVENTS.WISH_DELETED, { id });
}


