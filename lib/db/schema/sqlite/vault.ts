import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Vault tables. The vault used to live in its own SQLite file (data/vault.db)
 * for local mode. In cloud mode it lives in the same Postgres DB scoped by
 * user_id. To keep the codebase uniform we mirror them in the main schema;
 * local mode can still keep a separate file via the vault-db.ts adapter, but
 * the table definitions are the source of truth here.
 */

export const vaultMeta = sqliteTable("vault_meta", {
  userId: text("user_id").notNull().default("local-user"),
  key: text("key").notNull(),
  value: text("value").notNull(),
});

export const vaultSecrets = sqliteTable("vault_secrets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  encryptedValue: text("encrypted_value").notNull(),
  nonce: text("nonce").notNull(),
  encryptedNotes: text("encrypted_notes"),
  notesNonce: text("notes_nonce"),
  tags: text("tags").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});
