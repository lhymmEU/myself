import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
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
  return {
    ...row,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getAllUserProfiles(
  userId: string,
): Promise<PmUserProfile[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmUserProfiles)
    .where(eq(pmUserProfiles.userId, userId));
  return rows.map(parseUserRow);
}

export async function getUserProfile(
  id: string,
  userId: string,
): Promise<PmUserProfile | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmUserProfiles)
    .where(and(eq(pmUserProfiles.id, id), eq(pmUserProfiles.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseUserRow(row) : null;
}

export async function createUserProfile(
  input: CreateUserProfileInput,
  userId: string,
): Promise<PmUserProfile> {
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
  await db.insert(pmUserProfiles).values(row);
  return parseUserRow(row as typeof pmUserProfiles.$inferSelect);
}

export async function updateUserProfile(
  input: UpdateUserProfileInput,
  userId: string,
): Promise<PmUserProfile> {
  const db = getDb();
  const existing = await db
    .select()
    .from(pmUserProfiles)
    .where(
      and(
        eq(pmUserProfiles.id, input.id),
        eq(pmUserProfiles.userId, userId),
      ),
    )
    .limit(1);
  if (!existing[0]) throw new Error(`User profile not found: ${input.id}`);

  const updates: Partial<typeof pmUserProfiles.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.type !== undefined) updates.type = input.type;
  if (input.typeColor !== undefined) updates.typeColor = input.typeColor;
  if (input.contact !== undefined) updates.contact = input.contact;
  if (input.notes !== undefined) updates.notes = input.notes;

  await db
    .update(pmUserProfiles)
    .set(updates)
    .where(
      and(
        eq(pmUserProfiles.id, input.id),
        eq(pmUserProfiles.userId, userId),
      ),
    );
  const rows = await db
    .select()
    .from(pmUserProfiles)
    .where(
      and(
        eq(pmUserProfiles.id, input.id),
        eq(pmUserProfiles.userId, userId),
      ),
    )
    .limit(1);
  return parseUserRow(rows[0]!);
}

export async function deleteUserProfile(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(pmUserProfiles)
    .where(and(eq(pmUserProfiles.id, id), eq(pmUserProfiles.userId, userId)));
}

// ─── Features ───

function parseFeatureRow(row: typeof pmFeatures.$inferSelect): PmFeature {
  return {
    ...row,
    status: row.status as PmFeature["status"],
    priority: row.priority as PmFeature["priority"],
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getAllFeatures(
  userId: string,
): Promise<PmFeature[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmFeatures)
    .where(eq(pmFeatures.userId, userId));
  return rows.map(parseFeatureRow);
}

export async function getFeature(
  id: string,
  userId: string,
): Promise<PmFeature | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, id), eq(pmFeatures.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseFeatureRow(row) : null;
}

export async function createFeature(
  input: CreateFeatureInput,
  userId: string,
): Promise<PmFeature> {
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
  await db.insert(pmFeatures).values(row);
  return parseFeatureRow(row as typeof pmFeatures.$inferSelect);
}

export async function updateFeature(
  input: UpdateFeatureInput,
  userId: string,
): Promise<PmFeature> {
  const db = getDb();
  const existing = await db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)))
    .limit(1);
  if (!existing[0]) throw new Error(`Feature not found: ${input.id}`);

  const updates: Partial<typeof pmFeatures.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.status !== undefined) updates.status = input.status;
  if (input.priority !== undefined) updates.priority = input.priority;
  if (input.notes !== undefined) updates.notes = input.notes;

  await db
    .update(pmFeatures)
    .set(updates)
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)));
  const rows = await db
    .select()
    .from(pmFeatures)
    .where(and(eq(pmFeatures.id, input.id), eq(pmFeatures.userId, userId)))
    .limit(1);
  return parseFeatureRow(rows[0]!);
}

export async function deleteFeature(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(pmFeatures)
    .where(and(eq(pmFeatures.id, id), eq(pmFeatures.userId, userId)));
}

// ─── Demands & Assumptions ───

function parseDemandRow(row: typeof pmDemands.$inferSelect): PmDemand {
  return {
    ...row,
    type: row.type as PmDemand["type"],
    status: row.status as PmDemand["status"],
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getAllDemands(
  userId: string,
): Promise<PmDemand[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmDemands)
    .where(eq(pmDemands.userId, userId));
  return rows.map(parseDemandRow);
}

export async function getDemand(
  id: string,
  userId: string,
): Promise<PmDemand | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, id), eq(pmDemands.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseDemandRow(row) : null;
}

export async function createDemand(
  input: CreateDemandInput,
  userId: string,
): Promise<PmDemand> {
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
  await db.insert(pmDemands).values(row);
  return parseDemandRow(row as typeof pmDemands.$inferSelect);
}

export async function updateDemand(
  input: UpdateDemandInput,
  userId: string,
): Promise<PmDemand> {
  const db = getDb();
  const existing = await db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)))
    .limit(1);
  if (!existing[0]) throw new Error(`Demand not found: ${input.id}`);

  const updates: Partial<typeof pmDemands.$inferInsert> = {
    updatedAt: Date.now(),
  };
  if (input.title !== undefined) updates.title = input.title;
  if (input.description !== undefined) updates.description = input.description;
  if (input.type !== undefined) updates.type = input.type;
  if (input.status !== undefined) updates.status = input.status;
  if (input.evidence !== undefined) updates.evidence = input.evidence;

  await db
    .update(pmDemands)
    .set(updates)
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)));
  const rows = await db
    .select()
    .from(pmDemands)
    .where(and(eq(pmDemands.id, input.id), eq(pmDemands.userId, userId)))
    .limit(1);
  return parseDemandRow(rows[0]!);
}

export async function deleteDemand(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(pmDemands)
    .where(and(eq(pmDemands.id, id), eq(pmDemands.userId, userId)));
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
  return {
    ...row,
    details,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

export async function getAllStakeholders(
  userId: string,
): Promise<PmStakeholder[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmStakeholders)
    .where(eq(pmStakeholders.userId, userId));
  return rows.map(parseStakeholderRow);
}

export async function getStakeholder(
  id: string,
  userId: string,
): Promise<PmStakeholder | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(pmStakeholders)
    .where(and(eq(pmStakeholders.id, id), eq(pmStakeholders.userId, userId)))
    .limit(1);
  const row = rows[0];
  return row ? parseStakeholderRow(row) : null;
}

export async function createStakeholder(
  input: CreateStakeholderInput,
  userId: string,
): Promise<PmStakeholder> {
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
  await db.insert(pmStakeholders).values(row);
  return parseStakeholderRow(row as typeof pmStakeholders.$inferSelect);
}

export async function updateStakeholder(
  input: UpdateStakeholderInput,
  userId: string,
): Promise<PmStakeholder> {
  const db = getDb();
  const existingRows = await db
    .select()
    .from(pmStakeholders)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];
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

  await db
    .update(pmStakeholders)
    .set(updates)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    );
  const rows = await db
    .select()
    .from(pmStakeholders)
    .where(
      and(
        eq(pmStakeholders.id, input.id),
        eq(pmStakeholders.userId, userId),
      ),
    )
    .limit(1);
  return parseStakeholderRow(rows[0]!);
}

export async function deleteStakeholder(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(pmStakeholders)
    .where(and(eq(pmStakeholders.id, id), eq(pmStakeholders.userId, userId)));
}
