import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const characterAppearance = sqliteTable("character_appearance", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
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

export const userSkills = sqliteTable("user_skills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  level: text("level").notNull().default("familiar"),
  category: text("category").default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const skillWishlist = sqliteTable("skill_wishlist", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  targetLevel: text("target_level").notNull().default("familiar"),
  priority: text("priority").notNull().default("medium"),
  notes: text("notes").default(""),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const wishlistTodos = sqliteTable("wishlist_todos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  wishId: text("wish_id").notNull(),
  content: text("content").notNull(),
  completed: integer("completed", { mode: "number" }).notNull().default(0),
  sortOrder: integer("sort_order", { mode: "number" }).notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const userWishes = sqliteTable("user_wishes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  category: text("category", {
    enum: ["learn", "place", "goal"],
  }).notNull(),
  userDescription: text("user_description").notNull(),
  planData: text("plan_data").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
