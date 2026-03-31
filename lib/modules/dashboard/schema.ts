import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const characterAppearance = sqliteTable("character_appearance", {
  id: text("id").primaryKey(),
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

export const userSkills = sqliteTable("user_skills", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level", { mode: "number" }).notNull().default(1),
  category: text("category").default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const skillWishlist = sqliteTable("skill_wishlist", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  targetLevel: integer("target_level", { mode: "number" }).notNull().default(5),
  priority: text("priority").notNull().default("medium"),
  notes: text("notes").default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const clawAssignedJobs = sqliteTable("claw_assigned_jobs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("active"),
  cronJobId: text("cron_job_id"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});
