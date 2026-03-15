import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { pmUserProfiles, pmFeatures, pmDemands } from "./product-schema";
import type {
  PmUserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  PmFeature,
  CreateFeatureInput,
  UpdateFeatureInput,
  PmDemand,
  CreateDemandInput,
  UpdateDemandInput,
} from "./product-types";

// ─── User Profiles ───

function parseUserRow(
  row: typeof pmUserProfiles.$inferSelect
): PmUserProfile {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags) as string[];
  } catch {
    tags = [];
  }
  return { ...row, tags };
}

export function getAllUserProfiles(): PmUserProfile[] {
  const db = getDb();
  return db.select().from(pmUserProfiles).all().map(parseUserRow);
}

export function getUserProfile(id: string): PmUserProfile | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmUserProfiles)
    .where(eq(pmUserProfiles.id, id))
    .get();
  return row ? parseUserRow(row) : null;
}

export function createUserProfile(input: CreateUserProfileInput): PmUserProfile {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    name: input.name,
    email: input.email ?? "",
    company: input.company ?? "",
    role: input.role ?? "",
    notes: input.notes ?? "",
    tags: JSON.stringify(input.tags ?? []),
    createdAt: now,
    updatedAt: now,
  };
  db.insert(pmUserProfiles).values(row).run();
  return parseUserRow(row as typeof pmUserProfiles.$inferSelect);
}

export function updateUserProfile(input: UpdateUserProfileInput): PmUserProfile {
  const db = getDb();
  const existing = db
    .select()
    .from(pmUserProfiles)
    .where(eq(pmUserProfiles.id, input.id))
    .get();
  if (!existing) throw new Error(`User profile not found: ${input.id}`);

  const updates: Partial<typeof pmUserProfiles.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.email !== undefined) updates.email = input.email;
  if (input.company !== undefined) updates.company = input.company;
  if (input.role !== undefined) updates.role = input.role;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.tags !== undefined) updates.tags = JSON.stringify(input.tags);

  db.update(pmUserProfiles)
    .set(updates)
    .where(eq(pmUserProfiles.id, input.id))
    .run();
  const row = db
    .select()
    .from(pmUserProfiles)
    .where(eq(pmUserProfiles.id, input.id))
    .get();
  return parseUserRow(row!);
}

export function deleteUserProfile(id: string): void {
  const db = getDb();
  db.delete(pmUserProfiles).where(eq(pmUserProfiles.id, id)).run();
}

// ─── Features ───

function parseFeatureRow(
  row: typeof pmFeatures.$inferSelect
): PmFeature {
  return {
    ...row,
    status: row.status as PmFeature["status"],
    priority: row.priority as PmFeature["priority"],
  };
}

export function getAllFeatures(): PmFeature[] {
  const db = getDb();
  return db.select().from(pmFeatures).all().map(parseFeatureRow);
}

export function getFeature(id: string): PmFeature | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmFeatures)
    .where(eq(pmFeatures.id, id))
    .get();
  return row ? parseFeatureRow(row) : null;
}

export function createFeature(input: CreateFeatureInput): PmFeature {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    name: input.name,
    description: input.description ?? "",
    status: input.status ?? "planned",
    priority: input.priority ?? "medium",
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(pmFeatures).values(row).run();
  return parseFeatureRow(row as typeof pmFeatures.$inferSelect);
}

export function updateFeature(input: UpdateFeatureInput): PmFeature {
  const db = getDb();
  const existing = db
    .select()
    .from(pmFeatures)
    .where(eq(pmFeatures.id, input.id))
    .get();
  if (!existing) throw new Error(`Feature not found: ${input.id}`);

  const updates: Partial<typeof pmFeatures.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.notes !== undefined) updates.notes = input.notes;

  db.update(pmFeatures)
    .set(updates)
    .where(eq(pmFeatures.id, input.id))
    .run();
  const row = db
    .select()
    .from(pmFeatures)
    .where(eq(pmFeatures.id, input.id))
    .get();
  return parseFeatureRow(row!);
}

export function deleteFeature(id: string): void {
  const db = getDb();
  db.delete(pmFeatures).where(eq(pmFeatures.id, id)).run();
}

// ─── Demands & Assumptions ───

function parseDemandRow(
  row: typeof pmDemands.$inferSelect
): PmDemand {
  return {
    ...row,
    type: row.type as PmDemand["type"],
    status: row.status as PmDemand["status"],
  };
}

export function getAllDemands(): PmDemand[] {
  const db = getDb();
  return db.select().from(pmDemands).all().map(parseDemandRow);
}

export function getDemand(id: string): PmDemand | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmDemands)
    .where(eq(pmDemands.id, id))
    .get();
  return row ? parseDemandRow(row) : null;
}

export function createDemand(input: CreateDemandInput): PmDemand {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    title: input.title,
    description: input.description ?? "",
    type: input.type ?? "demand",
    status: input.status ?? "unvalidated",
    evidence: input.evidence ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(pmDemands).values(row).run();
  return parseDemandRow(row as typeof pmDemands.$inferSelect);
}

export function updateDemand(input: UpdateDemandInput): PmDemand {
  const db = getDb();
  const existing = db
    .select()
    .from(pmDemands)
    .where(eq(pmDemands.id, input.id))
    .get();
  if (!existing) throw new Error(`Demand not found: ${input.id}`);

  const updates: Partial<typeof pmDemands.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.evidence !== undefined) updates.evidence = input.evidence;

  db.update(pmDemands)
    .set(updates)
    .where(eq(pmDemands.id, input.id))
    .run();
  const row = db
    .select()
    .from(pmDemands)
    .where(eq(pmDemands.id, input.id))
    .get();
  return parseDemandRow(row!);
}

export function deleteDemand(id: string): void {
  const db = getDb();
  db.delete(pmDemands).where(eq(pmDemands.id, id)).run();
}
