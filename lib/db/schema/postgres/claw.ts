import {
  pgTable,
  text,
  bigint,
  integer,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const cronJobs = pgTable("cron_jobs", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  command: text("command").notNull(),
  sessionId: text("session_id"),
  agentId: text("agent_id"),
  connectionId: text("connection_id"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

/**
 * Pairing codes minted by `/api/claw/pair`. Consumed by `lobsterd pair <code>`
 * which exchanges public keys and provisions a `claw_connections` row.
 * Mirrored in SQLite for schema parity even though local installs don't
 * actively use this flow.
 */
export const clawPairings = pgTable("claw_pairings", {
  code: text("code").primaryKey(),
  userId: uuid("user_id").notNull(),
  lobsterId: text("lobster_id").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  consumedAt: bigint("consumed_at", { mode: "number" }),
  agentJwt: text("agent_jwt"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const clawConnections = pgTable("claw_connections", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull().default(22),
  username: text("username").notNull(),
  authMethod: text("auth_method").notNull().default("key"),
  password: text("password"),
  privateKey: text("private_key"),
  passphrase: text("passphrase"),
  gatewayPort: integer("gateway_port").notNull().default(18789),
  isDefault: boolean("is_default").notNull().default(false),
  transport: text("transport").notNull().default("ssh"),
  pairingCode: text("pairing_code"),
  pairingExpiresAt: bigint("pairing_expires_at", { mode: "number" }),
  agentJwt: text("agent_jwt"),
  relayUrl: text("relay_url"),
  publicKey: text("public_key"),
  credentialSecretId: text("credential_secret_id"),
  hostKeyFingerprint: text("host_key_fingerprint"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
