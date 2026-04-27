import { pgTable, text, bigint, uuid, primaryKey } from "drizzle-orm/pg-core";

export const vaultMeta = pgTable(
  "vault_meta",
  {
    userId: uuid("user_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.key] }),
  }),
);

export const vaultSecrets = pgTable("vault_secrets", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"),
  encryptedValue: text("encrypted_value").notNull(),
  nonce: text("nonce").notNull(),
  encryptedNotes: text("encrypted_notes"),
  notesNonce: text("notes_nonce"),
  tags: text("tags").notNull().default("[]"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});
