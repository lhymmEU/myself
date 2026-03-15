import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const pmUserProfiles = sqliteTable("pm_user_profiles", {
  id: text("id").primaryKey(),
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
