import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Single claw_connections table — drives the SSH-only "connect to your
 * openclaw agent" experience. Keep this schema minimal: anything beyond
 * what `lib/claw/ssh.ts` needs to dial a Client should live somewhere
 * else (vault, settings, etc).
 */
export const clawConnections = sqliteTable("claw_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port", { mode: "number" }).notNull().default(22),
  username: text("username").notNull(),
  // "password" | "key"
  authMethod: text("auth_method").notNull(),
  password: text("password"),
  privateKey: text("private_key"),
  passphrase: text("passphrase"),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
