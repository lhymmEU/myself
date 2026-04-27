import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const cronJobs = sqliteTable("cron_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  expression: text("expression").notNull(),
  command: text("command").notNull(),
  sessionId: text("session_id"),
  agentId: text("agent_id"),
  connectionId: text("connection_id"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

/**
 * Pairing codes minted by the cloud server when a user clicks "Add lobster".
 * `lobsterd pair <code>` consumes one row, exchanges public keys, and the
 * server then provisions a `claw_connections` row pointing at the relay.
 *
 * Local installs don't really use this table (lobsterd is a cloud-only
 * companion), but mirroring the schema keeps SQLite ↔ Postgres parity
 * checks happy.
 */
export const clawPairings = sqliteTable("claw_pairings", {
  code: text("code").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  lobsterId: text("lobster_id").notNull(),
  expiresAt: integer("expires_at", { mode: "number" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "number" }),
  agentJwt: text("agent_jwt"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const clawConnections = sqliteTable("claw_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port", { mode: "number" }).notNull().default(22),
  username: text("username").notNull(),
  authMethod: text("auth_method").notNull().default("key"),
  password: text("password"),
  privateKey: text("private_key"),
  passphrase: text("passphrase"),
  gatewayPort: integer("gateway_port", { mode: "number" })
    .notNull()
    .default(18789),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  // Cloud-only relay metadata. Local mode leaves these null.
  transport: text("transport").notNull().default("ssh"),
  pairingCode: text("pairing_code"),
  pairingExpiresAt: integer("pairing_expires_at", { mode: "number" }),
  agentJwt: text("agent_jwt"),
  relayUrl: text("relay_url"),
  publicKey: text("public_key"),
  // Edge transport (Flavor A): browser WASM SSH client + worker TCP bridge.
  // `credentialSecretId` references a vault entry holding the encrypted SSH
  // credential blob; the server never sees the plaintext key/password.
  // `hostKeyFingerprint` is populated TOFU on the first successful connect
  // and compared on every subsequent connect.
  credentialSecretId: text("credential_secret_id"),
  hostKeyFingerprint: text("host_key_fingerprint"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
