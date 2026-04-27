import {
  pgTable,
  text,
  bigint,
  doublePrecision,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const invoiceClients = pgTable("invoice_clients", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  company: text("company"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const invoiceSignatures = pgTable("invoice_signatures", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  dataUrl: text("data_url").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const invoices = pgTable("invoices", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
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
  subtotal: doublePrecision("subtotal").notNull().default(0),
  tax: doublePrecision("tax").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const invoiceItems = pgTable("invoice_items", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  rate: doublePrecision("rate").notNull().default(0),
  quantity: doublePrecision("quantity").notNull().default(1),
  amount: doublePrecision("amount").notNull().default(0),
  sortOrder: bigint("sort_order", { mode: "number" }).notNull().default(0),
});
