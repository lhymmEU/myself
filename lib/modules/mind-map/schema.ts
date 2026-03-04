import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";

export const lifeNodes = sqliteTable("life_nodes", {
  id: text("id").primaryKey(),
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
