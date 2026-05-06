import { and, count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import {
  userSkills,
  skillWishlist,
  characterAppearance,
  wishlistTodos,
} from "./schema";
import type { SkillLevel } from "./schema";

// --- Character Appearance ---

export interface CharacterColors {
  skinColor?: string | null;
  hairColor?: string | null;
  shirtColor?: string | null;
  pantsColor?: string | null;
  shoeColor?: string | null;
  shellColor?: string | null;
  shellDarkColor?: string | null;
  bellyColor?: string | null;
  eyeColor?: string | null;
}

export async function getCharacterAppearance(
  characterType: string,
  userId: string = LOCAL_USER_ID,
): Promise<CharacterColors | null> {
  const rows = await getDb()
    .select()
    .from(characterAppearance)
    .where(
      and(
        eq(characterAppearance.userId, userId),
        eq(characterAppearance.characterType, characterType),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertCharacterAppearance(
  characterType: string,
  colors: CharacterColors,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  const existing = await getCharacterAppearance(characterType, userId);
  if (existing) {
    await getDb()
      .update(characterAppearance)
      .set(colors)
      .where(
        and(
          eq(characterAppearance.userId, userId),
          eq(characterAppearance.characterType, characterType),
        ),
      );
  } else {
    await getDb()
      .insert(characterAppearance)
      .values({ id: nanoid(), userId, characterType, ...colors });
  }
}

// --- User Skills ---

function normalizeSkill<T extends { createdAt: number | string }>(row: T): T {
  return { ...row, createdAt: Number(row.createdAt) };
}

export async function listUserSkills(userId: string = LOCAL_USER_ID) {
  const rows = await getDb()
    .select()
    .from(userSkills)
    .where(eq(userSkills.userId, userId));
  return rows.map(normalizeSkill);
}

export async function createUserSkill(
  data: {
    name: string;
    level?: SkillLevel;
    category?: string;
  },
  userId: string = LOCAL_USER_ID,
) {
  const id = nanoid();
  await getDb()
    .insert(userSkills)
    .values({
      id,
      userId,
      name: data.name,
      level: data.level ?? "familiar",
      category: data.category ?? "",
      createdAt: Date.now(),
    });
  return { id };
}

export async function updateUserSkill(
  id: string,
  data: Partial<{ name: string; level: SkillLevel; category: string }>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .update(userSkills)
    .set(data)
    .where(and(eq(userSkills.id, id), eq(userSkills.userId, userId)));
}

export async function deleteUserSkill(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .delete(userSkills)
    .where(and(eq(userSkills.id, id), eq(userSkills.userId, userId)));
}

// --- Skill Wishlist ---

function normalizeWish<T extends { createdAt: number | string }>(row: T): T {
  return { ...row, createdAt: Number(row.createdAt) };
}

export async function listWishlist(userId: string = LOCAL_USER_ID) {
  const rows = await getDb()
    .select()
    .from(skillWishlist)
    .where(eq(skillWishlist.userId, userId));
  return rows.map(normalizeWish);
}

export async function countWishlist(
  userId: string = LOCAL_USER_ID,
): Promise<number> {
  const result = await getDb()
    .select({ value: count() })
    .from(skillWishlist)
    .where(eq(skillWishlist.userId, userId));
  return Number(result[0]?.value ?? 0);
}

export async function createWish(
  data: {
    name: string;
    targetLevel?: SkillLevel;
    priority?: string;
    notes?: string;
  },
  userId: string = LOCAL_USER_ID,
) {
  const current = await countWishlist(userId);
  if (current >= 3) {
    throw new Error("wishlist_full");
  }
  const id = nanoid();
  await getDb()
    .insert(skillWishlist)
    .values({
      id,
      userId,
      name: data.name,
      targetLevel: data.targetLevel ?? "familiar",
      priority: data.priority ?? "medium",
      notes: data.notes ?? "",
      createdAt: Date.now(),
    });
  return { id };
}

export async function updateWish(
  id: string,
  data: Partial<{
    name: string;
    targetLevel: SkillLevel;
    priority: string;
    notes: string;
  }>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .update(skillWishlist)
    .set(data)
    .where(and(eq(skillWishlist.id, id), eq(skillWishlist.userId, userId)));
}

export async function deleteWish(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .delete(wishlistTodos)
    .where(
      and(eq(wishlistTodos.wishId, id), eq(wishlistTodos.userId, userId)),
    );
  await getDb()
    .delete(skillWishlist)
    .where(and(eq(skillWishlist.id, id), eq(skillWishlist.userId, userId)));
}

// --- Wishlist Todos ---

function normalizeWishTodo<
  T extends {
    completed: number | string;
    sortOrder: number | string;
    createdAt: number | string;
  },
>(row: T): T {
  return {
    ...row,
    completed: Number(row.completed),
    sortOrder: Number(row.sortOrder),
    createdAt: Number(row.createdAt),
  };
}

export async function listWishTodos(
  wishId: string,
  userId: string = LOCAL_USER_ID,
) {
  const rows = await getDb()
    .select()
    .from(wishlistTodos)
    .where(
      and(
        eq(wishlistTodos.userId, userId),
        eq(wishlistTodos.wishId, wishId),
      ),
    );
  return rows.map(normalizeWishTodo);
}

export async function createWishTodo(
  data: { wishId: string; content: string; sortOrder?: number },
  userId: string = LOCAL_USER_ID,
) {
  const existing = await listWishTodos(data.wishId, userId);
  if (existing.length >= 5) {
    throw new Error("wish_todos_full");
  }
  const id = nanoid();
  await getDb()
    .insert(wishlistTodos)
    .values({
      id,
      userId,
      wishId: data.wishId,
      content: data.content,
      sortOrder: data.sortOrder ?? existing.length,
      createdAt: Date.now(),
    });
  return { id };
}

export async function updateWishTodo(
  id: string,
  data: Partial<{ content: string; completed: number; sortOrder: number }>,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .update(wishlistTodos)
    .set(data)
    .where(and(eq(wishlistTodos.id, id), eq(wishlistTodos.userId, userId)));
}

export async function deleteWishTodo(
  id: string,
  userId: string = LOCAL_USER_ID,
): Promise<void> {
  await getDb()
    .delete(wishlistTodos)
    .where(and(eq(wishlistTodos.id, id), eq(wishlistTodos.userId, userId)));
}

export async function bulkCreateWishTodos(
  wishId: string,
  contents: string[],
  userId: string = LOCAL_USER_ID,
) {
  const existing = await listWishTodos(wishId, userId);
  if (existing.length > 0) {
    await getDb()
      .delete(wishlistTodos)
      .where(
        and(
          eq(wishlistTodos.wishId, wishId),
          eq(wishlistTodos.userId, userId),
        ),
      );
  }
  const capped = contents.slice(0, 5);
  const db = getDb();
  for (let i = 0; i < capped.length; i++) {
    await db.insert(wishlistTodos).values({
      id: nanoid(),
      userId,
      wishId,
      content: capped[i],
      sortOrder: i,
      createdAt: Date.now(),
    });
  }
  return { count: capped.length };
}

