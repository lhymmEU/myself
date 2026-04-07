import { getDb } from "@/lib/core/db";
import { userSkills, skillWishlist, clawAssignedJobs, characterAppearance, wishlistTodos } from "./schema";
import type { SkillLevel } from "./schema";
import { eq, count } from "drizzle-orm";
import { nanoid } from "nanoid";

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

export function getCharacterAppearance(characterType: string): CharacterColors | null {
  const rows = getDb()
    .select()
    .from(characterAppearance)
    .where(eq(characterAppearance.characterType, characterType))
    .all();
  return rows[0] ?? null;
}

export function upsertCharacterAppearance(characterType: string, colors: CharacterColors) {
  const existing = getCharacterAppearance(characterType);
  if (existing) {
    getDb()
      .update(characterAppearance)
      .set(colors)
      .where(eq(characterAppearance.characterType, characterType))
      .run();
  } else {
    getDb()
      .insert(characterAppearance)
      .values({ id: nanoid(), characterType, ...colors })
      .run();
  }
}

// --- User Skills ---

export function listUserSkills() {
  return getDb().select().from(userSkills).all();
}

export function createUserSkill(data: {
  name: string;
  level?: SkillLevel;
  category?: string;
}) {
  const id = nanoid();
  getDb()
    .insert(userSkills)
    .values({
      id,
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
  data: Partial<{ name: string; level: SkillLevel; category: string }>
) {
  getDb().update(userSkills).set(data).where(eq(userSkills.id, id)).run();
}

export function deleteUserSkill(id: string) {
  getDb().delete(userSkills).where(eq(userSkills.id, id)).run();
}

// --- Skill Wishlist ---

export function listWishlist() {
  return getDb().select().from(skillWishlist).all();
}

export function countWishlist(): number {
  const result = getDb().select({ value: count() }).from(skillWishlist).all();
  return result[0]?.value ?? 0;
}

export function createWish(data: {
  name: string;
  targetLevel?: SkillLevel;
  priority?: string;
  notes?: string;
}) {
  const current = countWishlist();
  if (current >= 3) {
    throw new Error("wishlist_full");
  }
  const id = nanoid();
  getDb()
    .insert(skillWishlist)
    .values({
      id,
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
  data: Partial<{ name: string; targetLevel: SkillLevel; priority: string; notes: string }>
) {
  getDb().update(skillWishlist).set(data).where(eq(skillWishlist.id, id)).run();
}

export function deleteWish(id: string) {
  getDb().delete(wishlistTodos).where(eq(wishlistTodos.wishId, id)).run();
  getDb().delete(skillWishlist).where(eq(skillWishlist.id, id)).run();
}

// --- Wishlist Todos ---

export function listWishTodos(wishId: string) {
  return getDb()
    .select()
    .from(wishlistTodos)
    .where(eq(wishlistTodos.wishId, wishId))
    .all();
}

export function createWishTodo(data: { wishId: string; content: string; sortOrder?: number }) {
  const existing = listWishTodos(data.wishId);
  if (existing.length >= 5) {
    throw new Error("wish_todos_full");
  }
  const id = nanoid();
  getDb()
    .insert(wishlistTodos)
    .values({
      id,
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
  data: Partial<{ content: string; completed: number; sortOrder: number }>
) {
  getDb().update(wishlistTodos).set(data).where(eq(wishlistTodos.id, id)).run();
}

export function deleteWishTodo(id: string) {
  getDb().delete(wishlistTodos).where(eq(wishlistTodos.id, id)).run();
}

export function bulkCreateWishTodos(wishId: string, contents: string[]) {
  const existing = listWishTodos(wishId);
  if (existing.length > 0) {
    getDb().delete(wishlistTodos).where(eq(wishlistTodos.wishId, wishId)).run();
  }
  const capped = contents.slice(0, 5);
  const db = getDb();
  for (let i = 0; i < capped.length; i++) {
    db.insert(wishlistTodos)
      .values({
        id: nanoid(),
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

export function listAssignedJobs() {
  return getDb().select().from(clawAssignedJobs).all();
}

export function createAssignedJob(data: {
  name: string;
  description?: string;
  status?: string;
  cronJobId?: string;
}) {
  const id = nanoid();
  getDb()
    .insert(clawAssignedJobs)
    .values({
      id,
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
  data: Partial<{ name: string; description: string; status: string; cronJobId: string | null }>
) {
  getDb()
    .update(clawAssignedJobs)
    .set(data)
    .where(eq(clawAssignedJobs.id, id))
    .run();
}

export function deleteAssignedJob(id: string) {
  getDb().delete(clawAssignedJobs).where(eq(clawAssignedJobs.id, id)).run();
}
