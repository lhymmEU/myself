import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const invoiceClients = sqliteTable("invoice_clients", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  company: text("company"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const invoiceSignatures = sqliteTable("invoice_signatures", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  name: text("name").notNull(),
  dataUrl: text("data_url").notNull(),
  isDefault: integer("is_default", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().default("local-user"),
  invoiceNumber: text("invoice_number").notNull().unique(),
  clientId: text("client_id").references(() => invoiceClients.id),
  date: text("date").notNull(),
  dueDate: text("due_date"),
  status: text("status", {
    enum: ["draft", "sent", "paid", "overdue"],
  })
    .notNull()
    .default("draft"),
  currency: text("currency").notNull().default("USD"),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  senderPhone: text("sender_phone"),
  paymentInfo: text("payment_info"),
  signatureId: text("signature_id").references(() => invoiceSignatures.id),
  notes: text("notes"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  total: real("total").notNull().default(0),
  createdAt: integer("created_at", { mode: "number" }).notNull(),
  updatedAt: integer("updated_at", { mode: "number" }).notNull(),
});

export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  rate: real("rate").notNull().default(0),
  quantity: real("quantity").notNull().default(1),
  amount: real("amount").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});
