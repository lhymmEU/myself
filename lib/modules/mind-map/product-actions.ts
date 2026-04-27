import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { LOCAL_USER_ID } from "@/lib/core/runtime";
import {
  pmUserProfiles,
  pmFeatures,
  pmDemands,
  pmStakeholders,
} from "./product-schema";
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
  PmStakeholder,
  StakeholderDetail,
  CreateStakeholderInput,
  UpdateStakeholderInput,
} from "./product-types";

// ─── User Profiles ───

function parseUserRow(
  row: typeof pmUserProfiles.$inferSelect,
): PmUserProfile {
  return { ...row };
}

export function getAllUserProfiles(
  userId: string = LOCAL_USER_ID,
): PmUserProfile[] {
  const db = getDb();
  return db
    .select()
    .from(pmUserProfiles)
    .where(eq(pmUserProfiles.userId, userId))
    .all()
    .map(parseUserRow);
}

export function getUserProfile(
  id: string,
  userId: string = LOCAL_USER_ID,
): PmUserProfile | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmUserProfiles)
    .where(
      and(eq(pmUserProfiles.id, id), eq(pmUserProfiles.userId, userId)),
    )
    .get();
  return row ? parseUserRow(row) : null;
}

export function createUserProfile(
  input: CreateUserProfileInput,
  userId: string = LOCAL_USER_ID,
): PmUserProfile {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    userId,
    name: input.name,
    type: input.type ?? "",
    typeColor: input.typeColor ?? "#3b82f6",
    contact: input.contact ?? "",
    notes: input.notes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(pmUserProfiles).values(row).run();
  return parseUserRow(row as typeof pmUserProfiles.$inferSelect);
}

export function updateUserProfile(
  input: UpdateUserProfileInput,
  userId: string = LOCAL_USER_ID,
): PmUserProfile {
  const db = getDb();
  const existing = db
    .select()
    .from(pmUserProfiles)
    .where(
      and(eq(pmUserProfiles.id, input.id), eq(pmUserProfiles.userId, userId)),
    )
    .get();
  if (!existing) throw new Error(`User profile not found: ${input.id}`);

  const updates: Partial<typeof pmUserProfiles.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.typeColor !== undefined) updates.typeColor = input.typeColor;
  if (input.contact !== undefined) updates.contact = input.contact;
  if (input.notes !== undefined) updates.notes = input.notes;

  db.update(pmUserProfiles)
    .set(updates)
    .where(
      and(eq(pmUserProfiles.id, input.id), eq(pmUserProfiles.userId, userId)),
    )
    .run();
  const row = db
    .select()
    .from(pmUserProfiles)
    .where(
      and(eq(pmUserProfiles.id, input.id), eq(pmUserProfiles.userId, userId)),
    )
    .get();
  return parseUserRow(row!);
}

export function deleteUserProfile(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(pmUserProfiles)
    .where(
      and(eq(pmUserProfiles.id, id), eq(pmUserProfiles.userId, userId)),
    )
    .run();
}

// ─── Features ───

function parseFeatureRow(row: typeof pmFeatures.$inferSelect): PmFeature {
  return {
    ...row,
    status: row.status as PmFeature["status"],
    priority: row.priority as PmFeature["priority"],
  };
}

export function getAllFeatures(
  userId: string = LOCAL_USER_ID,
): PmFeature[] {
  const db = getDb();
  return db
    .select()
    .from(pmFeatures)
    .where(eq(pmFeatures.userId, userId))
    .all()
    .map(parseFeatureRow);
}

export function getFeature(
  id: string,
  userId: string = LOCAL_USER_ID,
): PmFeature | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, id), eq(pmFeatures.userId, userId)))
    .get();
  return row ? parseFeatureRow(row) : null;
}

export function createFeature(
  input: CreateFeatureInput,
  userId: string = LOCAL_USER_ID,
): PmFeature {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    userId,
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

export function updateFeature(
  input: UpdateFeatureInput,
  userId: string = LOCAL_USER_ID,
): PmFeature {
  const db = getDb();
  const existing = db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)))
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
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)))
    .run();
  const row = db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)))
    .get();
  return parseFeatureRow(row!);
}

export function deleteFeature(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(pmFeatures)
    .where(and(eq(pmFeatures.id, id), eq(pmFeatures.userId, userId)))
    .run();
}

// ─── Demands & Assumptions ───

function parseDemandRow(row: typeof pmDemands.$inferSelect): PmDemand {
  return {
    ...row,
    type: row.type as PmDemand["type"],
    status: row.status as PmDemand["status"],
  };
}

export function getAllDemands(userId: string = LOCAL_USER_ID): PmDemand[] {
  const db = getDb();
  return db
    .select()
    .from(pmDemands)
    .where(eq(pmDemands.userId, userId))
    .all()
    .map(parseDemandRow);
}

export function getDemand(
  id: string,
  userId: string = LOCAL_USER_ID,
): PmDemand | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, id), eq(pmDemands.userId, userId)))
    .get();
  return row ? parseDemandRow(row) : null;
}

export function createDemand(
  input: CreateDemandInput,
  userId: string = LOCAL_USER_ID,
): PmDemand {
  const db = getDb();
  const now = Date.now();
  const row = {
    id: nanoid(),
    userId,
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

export function updateDemand(
  input: UpdateDemandInput,
  userId: string = LOCAL_USER_ID,
): PmDemand {
  const db = getDb();
  const existing = db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)))
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
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)))
    .run();
  const row = db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)))
    .get();
  return parseDemandRow(row!);
}

export function deleteDemand(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(pmDemands)
    .where(and(eq(pmDemands.id, id), eq(pmDemands.userId, userId)))
    .run();
}

// ─── Stakeholders ───

const EMPTY_DETAILS: StakeholderDetail = {
  objectives: "",
  desires: "",
  requirements: "",
  expectations: "",
};

function parseStakeholderRow(
  row: typeof pmStakeholders.$inferSelect,
): PmStakeholder {
  let details: StakeholderDetail;
  try {
    details = { ...EMPTY_DETAILS, ...JSON.parse(row.details) };
  } catch {
    details = { ...EMPTY_DETAILS };
  }
  return { ...row, details };
}

export function getAllStakeholders(
  userId: string = LOCAL_USER_ID,
): PmStakeholder[] {
  const db = getDb();
  return db
    .select()
    .from(pmStakeholders)
    .where(eq(pmStakeholders.userId, userId))
    .all()
    .map(parseStakeholderRow);
}

export function getStakeholder(
  id: string,
  userId: string = LOCAL_USER_ID,
): PmStakeholder | null {
  const db = getDb();
  const row = db
    .select()
    .from(pmStakeholders)
    .where(
      and(eq(pmStakeholders.id, id), eq(pmStakeholders.userId, userId)),
    )
    .get();
  return row ? parseStakeholderRow(row) : null;
}

export function createStakeholder(
  input: CreateStakeholderInput,
  userId: string = LOCAL_USER_ID,
): PmStakeholder {
  const db = getDb();
  const now = Date.now();
  const details = { ...EMPTY_DETAILS, ...input.details };
  const row = {
    id: nanoid(),
    userId,
    name: input.name,
    role: input.role ?? "",
    roleColor: input.roleColor ?? "#8b5cf6",
    details: JSON.stringify(details),
    clawNotes: input.clawNotes ?? "",
    createdAt: now,
    updatedAt: now,
  };
  db.insert(pmStakeholders).values(row).run();
  return parseStakeholderRow(row as typeof pmStakeholders.$inferSelect);
}

export function updateStakeholder(
  input: UpdateStakeholderInput,
  userId: string = LOCAL_USER_ID,
): PmStakeholder {
  const db = getDb();
  const existing = db
    .select()
    .from(pmStakeholders)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    )
    .get();
  if (!existing) throw new Error(`Stakeholder not found: ${input.id}`);

  const updates: Partial<typeof pmStakeholders.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.role !== undefined) updates.role = input.role;
  if (input.roleColor !== undefined) updates.roleColor = input.roleColor;
  if (input.clawNotes !== undefined) updates.clawNotes = input.clawNotes;
  if (input.details !== undefined) {
    let prev: StakeholderDetail;
    try {
      prev = { ...EMPTY_DETAILS, ...JSON.parse(existing.details) };
    } catch {
      prev = { ...EMPTY_DETAILS };
    }
    updates.details = JSON.stringify({ ...prev, ...input.details });
  }

  db.update(pmStakeholders)
    .set(updates)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    )
    .run();
  const row = db
    .select()
    .from(pmStakeholders)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    )
    .get();
  return parseStakeholderRow(row!);
}

export function deleteStakeholder(
  id: string,
  userId: string = LOCAL_USER_ID,
): void {
  const db = getDb();
  db.delete(pmStakeholders)
    .where(
      and(eq(pmStakeholders.id, id), eq(pmStakeholders.userId, userId)),
    )
    .run();
}
