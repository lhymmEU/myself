import { pgTable, text, bigint, uuid } from "drizzle-orm/pg-core";

export const characterAppearance = pgTable("character_appearance", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  characterType: text("character_type").notNull(),
  skinColor: text("skin_color"),
  hairColor: text("hair_color"),
  shirtColor: text("shirt_color"),
  pantsColor: text("pants_color"),
  shoeColor: text("shoe_color"),
  shellColor: text("shell_color"),
  shellDarkColor: text("shell_dark_color"),
  bellyColor: text("belly_color"),
  eyeColor: text("eye_color"),
});

export type SkillLevel = "familiar" | "fluent" | "mastering";

export const userSkills = pgTable("user_skills", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  level: text("level").notNull().default("familiar"),
  category: text("category").default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const skillWishlist = pgTable("skill_wishlist", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  targetLevel: text("target_level").notNull().default("familiar"),
  priority: text("priority").notNull().default("medium"),
  notes: text("notes").default(""),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const wishlistTodos = pgTable("wishlist_todos", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  wishId: text("wish_id").notNull(),
  content: text("content").notNull(),
  completed: bigint("completed", { mode: "number" }).notNull().default(0),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const clawAssignedJobs = pgTable("claw_assigned_jobs", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("active"),
  cronJobId: text("cron_job_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});
