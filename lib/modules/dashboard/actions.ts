import { and, count, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import {
  userSkills,
  skillWishlist,
  clawAssignedJobs,
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

export function getCharacterAppearance(
  characterType: string,
  userId: string = LOCAL_USER_ID,
): CharacterColors | null {
  const rows = getDb()
    .select()
    .from(characterAppearance)
    .where(
      and(
        eq(characterAppearance.userId, userId),
        eq(characterAppearance.characterType, characterType),
      ),
    )
    .all();
  return rows[0] ?? null;
}

export function upsertCharacterAppearance(
  characterType: string,
  colors: CharacterColors,
  userId: string = LOCAL_USER_ID,
) {
  const existing = getCharacterAppearance(characterType, userId);
  if (existing) {
    getDb()
      .update(characterAppearance)
      .set(colors)
      .where(
        and(
          eq(characterAppearance.userId, userId),
          eq(characterAppearance.characterType, characterType),
        ),
      )
      .run();
  } else {
    getDb()
      .insert(characterAppearance)
      .values({ id: nanoid(), userId, characterType, ...colors })
      .run();
  }
}

// --- User Skills ---

export function listUserSkills(userId: string = LOCAL_USER_ID) {
  return getDb()
    .select()
    .from(userSkills)
    .where(eq(userSkills.userId, userId))
    .all();
}

export function createUserSkill(
  data: {
    name: string;
    level?: SkillLevel;
    category?: string;
  },
  userId: string = LOCAL_USER_ID,
) {
  const id = nanoid();
  getDb()
    .insert(userSkills)
    .values({
      id,
      userId,
      name: data.name,
      level: data.level ?? "familiar",
      category: data.category ?? "",
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateUserSkill(
  id: string,
  data: Partial<{ name: string; level: SkillLevel; category: string }>,
  userId: string = LOCAL_USER_ID,
) {
  getDb()
    .update(userSkills)
    .set(data)
    .where(and(eq(userSkills.id, id), eq(userSkills.userId, userId)))
    .run();
}

export function deleteUserSkill(id: string, userId: string = LOCAL_USER_ID) {
  getDb()
    .delete(userSkills)
    .where(and(eq(userSkills.id, id), eq(userSkills.userId, userId)))
    .run();
}

// --- Skill Wishlist ---

export function listWishlist(userId: string = LOCAL_USER_ID) {
  return getDb()
    .select()
    .from(skillWishlist)
    .where(eq(skillWishlist.userId, userId))
    .all();
}

export function countWishlist(userId: string = LOCAL_USER_ID): number {
  const result = getDb()
    .select({ value: count() })
    .from(skillWishlist)
    .where(eq(skillWishlist.userId, userId))
    .all();
  return result[0]?.value ?? 0;
}

export function createWish(
  data: {
    name: string;
    targetLevel?: SkillLevel;
    priority?: string;
    notes?: string;
  },
  userId: string = LOCAL_USER_ID,
) {
  const current = countWishlist(userId);
  if (current >= 3) {
    throw new Error("wishlist_full");
  }
  const id = nanoid();
  getDb()
    .insert(skillWishlist)
    .values({
      id,
      userId,
      name: data.name,
      targetLevel: data.targetLevel ?? "familiar",
      priority: data.priority ?? "medium",
      notes: data.notes ?? "",
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateWish(
  id: string,
  data: Partial<{
    name: string;
    targetLevel: SkillLevel;
    priority: string;
    notes: string;
  }>,
  userId: string = LOCAL_USER_ID,
) {
  getDb()
    .update(skillWishlist)
    .set(data)
    .where(and(eq(skillWishlist.id, id), eq(skillWishlist.userId, userId)))
    .run();
}

export function deleteWish(id: string, userId: string = LOCAL_USER_ID) {
  getDb()
    .delete(wishlistTodos)
    .where(
      and(eq(wishlistTodos.wishId, id), eq(wishlistTodos.userId, userId)),
    )
    .run();
  getDb()
    .delete(skillWishlist)
    .where(and(eq(skillWishlist.id, id), eq(skillWishlist.userId, userId)))
    .run();
}

// --- Wishlist Todos ---

export function listWishTodos(
  wishId: string,
  userId: string = LOCAL_USER_ID,
) {
  return getDb()
    .select()
    .from(wishlistTodos)
    .where(
      and(
        eq(wishlistTodos.userId, userId),
        eq(wishlistTodos.wishId, wishId),
      ),
    )
    .all();
}

export function createWishTodo(
  data: { wishId: string; content: string; sortOrder?: number },
  userId: string = LOCAL_USER_ID,
) {
  const existing = listWishTodos(data.wishId, userId);
  if (existing.length >= 5) {
    throw new Error("wish_todos_full");
  }
  const id = nanoid();
  getDb()
    .insert(wishlistTodos)
    .values({
      id,
      userId,
      wishId: data.wishId,
      content: data.content,
      sortOrder: data.sortOrder ?? existing.length,
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateWishTodo(
  id: string,
  data: Partial<{ content: string; completed: number; sortOrder: number }>,
  userId: string = LOCAL_USER_ID,
) {
  getDb()
    .update(wishlistTodos)
    .set(data)
    .where(and(eq(wishlistTodos.id, id), eq(wishlistTodos.userId, userId)))
    .run();
}

export function deleteWishTodo(id: string, userId: string = LOCAL_USER_ID) {
  getDb()
    .delete(wishlistTodos)
    .where(and(eq(wishlistTodos.id, id), eq(wishlistTodos.userId, userId)))
    .run();
}

export function bulkCreateWishTodos(
  wishId: string,
  contents: string[],
  userId: string = LOCAL_USER_ID,
) {
  const existing = listWishTodos(wishId, userId);
  if (existing.length > 0) {
    getDb()
      .delete(wishlistTodos)
      .where(
        and(
          eq(wishlistTodos.wishId, wishId),
          eq(wishlistTodos.userId, userId),
        ),
      )
      .run();
  }
  const capped = contents.slice(0, 5);
  const db = getDb();
  for (let i = 0; i < capped.length; i++) {
    db.insert(wishlistTodos)
      .values({
        id: nanoid(),
        userId,
        wishId,
        content: capped[i],
        sortOrder: i,
        createdAt: Date.now(),
      })
      .run();
  }
  return { count: capped.length };
}

// --- Assigned Jobs ---

export function listAssignedJobs(userId: string = LOCAL_USER_ID) {
  return getDb()
    .select()
    .from(clawAssignedJobs)
    .where(eq(clawAssignedJobs.userId, userId))
    .all();
}

export function createAssignedJob(
  data: {
    name: string;
    description?: string;
    status?: string;
    cronJobId?: string;
  },
  userId: string = LOCAL_USER_ID,
) {
  const id = nanoid();
  getDb()
    .insert(clawAssignedJobs)
    .values({
      id,
      userId,
      name: data.name,
      description: data.description ?? "",
      status: data.status ?? "active",
      cronJobId: data.cronJobId ?? null,
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateAssignedJob(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    status: string;
    cronJobId: string | null;
  }>,
  userId: string = LOCAL_USER_ID,
) {
  getDb()
    .update(clawAssignedJobs)
    .set(data)
    .where(
      and(
        eq(clawAssignedJobs.id, id),
        eq(clawAssignedJobs.userId, userId),
      ),
    )
    .run();
}

export function deleteAssignedJob(
  id: string,
  userId: string = LOCAL_USER_ID,
) {
  getDb()
    .delete(clawAssignedJobs)
    .where(
      and(
        eq(clawAssignedJobs.id, id),
        eq(clawAssignedJobs.userId, userId),
      ),
    )
    .run();
}
