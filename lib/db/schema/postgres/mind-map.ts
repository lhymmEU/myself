import {
  pgTable,
  text,
  doublePrecision,
  bigint,
  uuid,
} from "drizzle-orm/pg-core";

const userId = uuid("user_id").notNull();
const ts = (name: string) => bigint(name, { mode: "number" }).notNull();

export const lifeNodes = pgTable("life_nodes", {
  id: text("id").primaryKey(),
  userId,
  label: text("label").notNull(),
  type: text("type", { enum: ["category", "item"] }).notNull(),
  parentId: text("parent_id"),
  color: text("color").notNull().default("#6366f1"),
  positionX: doublePrecision("position_x").notNull().default(0),
  positionY: doublePrecision("position_y").notNull().default(0),
  connections: text("connections").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const mindMapScenes = pgTable("mind_map_scenes", {
  id: text("id").primaryKey(),
  userId,
  name: text("name").notNull().default("Untitled"),
  elements: text("elements").notNull().default("[]"),
  appState: text("app_state").notNull().default("{}"),
  files: text("files").notNull().default("{}"),
  mode: text("mode", { enum: ["mind", "product"] }).notNull().default("mind"),
  isTodoSource: bigint("is_todo_source", { mode: "number" })
    .notNull()
    .default(0),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const pmUserProfiles = pgTable("pm_user_profiles", {
  id: text("id").primaryKey(),
  userId,
  name: text("name").notNull(),
  type: text("type").notNull().default(""),
  typeColor: text("type_color").notNull().default("#3b82f6"),
  contact: text("contact").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const pmFeatures = pgTable("pm_features", {
  id: text("id").primaryKey(),
  userId,
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status", {
    enum: ["planned", "in-progress", "done"],
  })
    .notNull()
    .default("planned"),
  priority: text("priority", {
    enum: ["low", "medium", "high", "critical"],
  })
    .notNull()
    .default("medium"),
  notes: text("notes").notNull().default(""),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const pmDemands = pgTable("pm_demands", {
  id: text("id").primaryKey(),
  userId,
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type", { enum: ["demand", "assumption"] })
    .notNull()
    .default("demand"),
  status: text("status", {
    enum: ["unvalidated", "validating", "validated", "invalidated"],
  })
    .notNull()
    .default("unvalidated"),
  evidence: text("evidence").notNull().default(""),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});

export const pmStakeholders = pgTable("pm_stakeholders", {
  id: text("id").primaryKey(),
  userId,
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  roleColor: text("role_color").notNull().default("#8b5cf6"),
  details: text("details").notNull().default("{}"),
  clawNotes: text("claw_notes").notNull().default(""),
  createdAt: ts("created_at"),
  updatedAt: ts("updated_at"),
});
