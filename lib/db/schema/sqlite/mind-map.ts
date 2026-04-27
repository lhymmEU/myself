import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const lifeNodes = sqliteTable("life_nodes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  label: text("label").notNull(),
  type: text("type", { enum: ["category", "item"] }).notNull(),
  parentId: text("parent_id"),
  color: text("color").notNull().default("#6366f1"),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  connections: text("connections").notNull().default("[]"),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const mindMapScenes = sqliteTable("mind_map_scenes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull().default("Untitled"),
  elements: text("elements").notNull().default("[]"),
  appState: text("app_state").notNull().default("{}"),
  files: text("files").notNull().default("{}"),
  mode: text("mode", { enum: ["mind", "product"] }).notNull().default("mind"),
  isTodoSource: integer("is_todo_source", { mode: "number" })
    .notNull()
    .default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const pmUserProfiles = sqliteTable("pm_user_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  type: text("type").notNull().default(""),
  typeColor: text("type_color").notNull().default("#3b82f6"),
  contact: text("contact").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const pmFeatures = sqliteTable("pm_features", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
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
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const pmDemands = sqliteTable("pm_demands", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
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
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const pmStakeholders = sqliteTable("pm_stakeholders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  roleColor: text("role_color").notNull().default("#8b5cf6"),
  details: text("details").notNull().default("{}"),
  clawNotes: text("claw_notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
