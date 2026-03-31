import { getDb } from "@/lib/core/db";
import { userSkills, skillWishlist, clawAssignedJobs, characterAppearance } from "./schema";
import { eq } from "drizzle-orm";
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
  level?: number;
  category?: string;
}) {
  const id = nanoid();
  getDb()
    .insert(userSkills)
    .values({
      id,
      name: data.name,
      level: data.level ?? 1,
      category: data.category ?? "",
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateUserSkill(
  id: string,
  data: Partial<{ name: string; level: number; category: string }>
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

export function createWish(data: {
  name: string;
  targetLevel?: number;
  priority?: string;
  notes?: string;
}) {
  const id = nanoid();
  getDb()
    .insert(skillWishlist)
    .values({
      id,
      name: data.name,
      targetLevel: data.targetLevel ?? 5,
      priority: data.priority ?? "medium",
      notes: data.notes ?? "",
      createdAt: Date.now(),
    })
    .run();
  return { id };
}

export function updateWish(
  id: string,
  data: Partial<{ name: string; targetLevel: number; priority: string; notes: string }>
) {
  getDb().update(skillWishlist).set(data).where(eq(skillWishlist.id, id)).run();
}

export function deleteWish(id: string) {
  getDb().delete(skillWishlist).where(eq(skillWishlist.id, id)).run();
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
