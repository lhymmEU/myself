import { pgTable, text, integer, bigint, boolean, uuid } from "drizzle-orm/pg-core";

/**
 * Postgres mirror of {@link import("../sqlite/claw").clawConnections}. The
 * schema-parity test guarantees the two stay in lock-step — keep the
 * column names, defaults, and nullability identical.
 */
export const clawConnections = pgTable("claw_connections", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull(),
  // "password" | "key"
  authMethod: text("auth_method").notNull(),
  password: text("password"),
  privateKey: text("private_key"),
  passphrase: text("passphrase"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
