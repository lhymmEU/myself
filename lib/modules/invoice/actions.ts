import { nanoid } from "nanoid";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/core/db";
import { eventBus } from "@/lib/core/event-bus";
import {
  invoiceClients,
  invoices,
  invoiceItems,
  invoiceSignatures,
} from "./schema";
import { INVOICE_EVENTS } from "./events";
import type {
  InvoiceClient,
  CreateClientInput,
  UpdateClientInput,
  Invoice,
  InvoiceWithDetails,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  InvoiceItem,
  InvoiceSignature,
  CreateSignatureInput,
} from "./types";

// ── Clients ──

export async function getAllClients(): Promise<InvoiceClient[]> {
  const db = getDb();
  const rows = db.select().from(invoiceClients).orderBy(desc(invoiceClients.createdAt)).all();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    company: r.company ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
  }));
}

export async function getClient(id: string): Promise<InvoiceClient | undefined> {
  const db = getDb();
  const row = db.select().from(invoiceClients).where(eq(invoiceClients.id, id)).get();
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    company: row.company ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function createClient(input: CreateClientInput): Promise<InvoiceClient> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  db.insert(invoiceClients)
    .values({ id, ...input, createdAt: now })
    .run();
  const result: InvoiceClient = { id, ...input, createdAt: now };
  await eventBus.emit("invoice", INVOICE_EVENTS.CLIENT_CREATED, result);
  return result;
}

export async function updateClient(input: UpdateClientInput): Promise<InvoiceClient> {
  const db = getDb();
  const { id, ...data } = input;
  db.update(invoiceClients).set(data).where(eq(invoiceClients.id, id)).run();
  const updated = await getClient(id);
  if (!updated) throw new Error("Client not found");
  return updated;
}

export async function deleteClient(id: string): Promise<void> {
  const db = getDb();
  db.delete(invoiceClients).where(eq(invoiceClients.id, id)).run();
  await eventBus.emit("invoice", INVOICE_EVENTS.CLIENT_DELETED, { id });
}

// ── Signatures ──

export async function getAllSignatures(): Promise<InvoiceSignature[]> {
  const db = getDb();
  const rows = db.select().from(invoiceSignatures).orderBy(desc(invoiceSignatures.createdAt)).all();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    dataUrl: r.dataUrl,
    isDefault: r.isDefault,
    createdAt: r.createdAt,
  }));
}

export async function createSignature(input: CreateSignatureInput): Promise<InvoiceSignature> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  if (input.isDefault) {
    db.update(invoiceSignatures).set({ isDefault: false }).run();
  }
  db.insert(invoiceSignatures)
    .values({
      id,
      name: input.name,
      dataUrl: input.dataUrl,
      isDefault: input.isDefault ?? false,
      createdAt: now,
    })
    .run();
  return { id, name: input.name, dataUrl: input.dataUrl, isDefault: input.isDefault ?? false, createdAt: now };
}

export async function setDefaultSignature(id: string): Promise<void> {
  const db = getDb();
  db.update(invoiceSignatures).set({ isDefault: false }).run();
  db.update(invoiceSignatures).set({ isDefault: true }).where(eq(invoiceSignatures.id, id)).run();
}

export async function deleteSignature(id: string): Promise<void> {
  const db = getDb();
  db.delete(invoiceSignatures).where(eq(invoiceSignatures.id, id)).run();
}

// ── Invoice number ──

export async function getNextInvoiceNumber(): Promise<string> {
  const db = getDb();
  const latest = db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(1)
    .get();
  if (!latest) return "INV0001";
  const match = latest.invoiceNumber.match(/INV(\d+)/);
  if (!match) return "INV0001";
  const next = parseInt(match[1], 10) + 1;
  return `INV${String(next).padStart(4, "0")}`;
}

// ── Invoices ──

export async function getAllInvoices(): Promise<Invoice[]> {
  const db = getDb();
  const rows = db.select().from(invoices).orderBy(desc(invoices.createdAt)).all();
  return rows.map(rowToInvoice);
}

export async function getInvoice(id: string): Promise<InvoiceWithDetails | undefined> {
  const db = getDb();
  const row = db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!row) return undefined;
  const inv = rowToInvoice(row);

  const items = db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .all()
    .map(rowToItem);

  let client: InvoiceClient | undefined;
  if (inv.clientId) {
    client = await getClient(inv.clientId);
  }

  let signature: InvoiceSignature | undefined;
  if (inv.signatureId) {
    const sigRow = db
      .select()
      .from(invoiceSignatures)
      .where(eq(invoiceSignatures.id, inv.signatureId))
      .get();
    if (sigRow) {
      signature = {
        id: sigRow.id,
        name: sigRow.name,
        dataUrl: sigRow.dataUrl,
        isDefault: sigRow.isDefault,
        createdAt: sigRow.createdAt,
      };
    }
  }

  return { ...inv, client, items, signature };
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceWithDetails> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  const invoiceNumber = input.invoiceNumber || await getNextInvoiceNumber();

  const subtotal = input.items.reduce((sum, it) => sum + it.amount, 0);
  const tax = input.tax ?? 0;
  const total = subtotal + tax;

  db.insert(invoices)
    .values({
      id,
      invoiceNumber,
      clientId: input.clientId,
      date: input.date,
      dueDate: input.dueDate,
      status: "draft",
      currency: input.currency ?? "USD",
      senderName: input.senderName,
      senderEmail: input.senderEmail,
      senderPhone: input.senderPhone,
      paymentInfo: input.paymentInfo,
      signatureId: input.signatureId,
      notes: input.notes,
      subtotal,
      tax,
      total,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const items: InvoiceItem[] = input.items.map((it, idx) => {
    const itemId = nanoid();
    db.insert(invoiceItems)
      .values({
        id: itemId,
        invoiceId: id,
        description: it.description,
        rate: it.rate,
        quantity: it.quantity,
        amount: it.amount,
        sortOrder: it.sortOrder ?? idx,
      })
      .run();
    return {
      id: itemId,
      invoiceId: id,
      description: it.description,
      rate: it.rate,
      quantity: it.quantity,
      amount: it.amount,
      sortOrder: it.sortOrder ?? idx,
    };
  });

  const invoice: Invoice = {
    id,
    invoiceNumber,
    clientId: input.clientId,
    date: input.date,
    dueDate: input.dueDate,
    status: "draft",
    currency: input.currency ?? "USD",
    senderName: input.senderName,
    senderEmail: input.senderEmail,
    senderPhone: input.senderPhone,
    paymentInfo: input.paymentInfo,
    signatureId: input.signatureId,
    notes: input.notes,
    subtotal,
    tax,
    total,
    createdAt: now,
    updatedAt: now,
  };

  let client: InvoiceClient | undefined;
  if (input.clientId) client = await getClient(input.clientId);

  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_CREATED, invoice);
  return { ...invoice, client, items };
}

export async function updateInvoice(input: UpdateInvoiceInput): Promise<InvoiceWithDetails> {
  const db = getDb();
  const now = Date.now();

  const existing = db.select().from(invoices).where(eq(invoices.id, input.id)).get();
  if (!existing) throw new Error("Invoice not found");

  if (input.items) {
    db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, input.id)).run();
    input.items.forEach((it, idx) => {
      db.insert(invoiceItems)
        .values({
          id: nanoid(),
          invoiceId: input.id,
          description: it.description,
          rate: it.rate,
          quantity: it.quantity,
          amount: it.amount,
          sortOrder: it.sortOrder ?? idx,
        })
        .run();
    });
  }

  const subtotal = input.items
    ? input.items.reduce((sum, it) => sum + it.amount, 0)
    : existing.subtotal;
  const tax = input.tax ?? existing.tax;
  const total = subtotal + tax;

  const updateData: Record<string, unknown> = { updatedAt: now, subtotal, tax, total };
  if (input.invoiceNumber !== undefined) updateData.invoiceNumber = input.invoiceNumber;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.senderName !== undefined) updateData.senderName = input.senderName;
  if (input.senderEmail !== undefined) updateData.senderEmail = input.senderEmail;
  if (input.senderPhone !== undefined) updateData.senderPhone = input.senderPhone;
  if (input.paymentInfo !== undefined) updateData.paymentInfo = input.paymentInfo;
  if (input.signatureId !== undefined) updateData.signatureId = input.signatureId;
  if (input.notes !== undefined) updateData.notes = input.notes;

  db.update(invoices).set(updateData).where(eq(invoices.id, input.id)).run();

  const result = await getInvoice(input.id);
  if (!result) throw new Error("Invoice not found after update");
  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_UPDATED, result);
  return result;
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = getDb();
  db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id)).run();
  db.delete(invoices).where(eq(invoices.id, id)).run();
  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_DELETED, { id });
}

export async function markInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "overdue"
): Promise<void> {
  const db = getDb();
  db.update(invoices)
    .set({ status, updatedAt: Date.now() })
    .where(eq(invoices.id, id))
    .run();
  if (status === "sent") {
    await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_SENT, { id });
  }
}

// ── Helpers ──

function rowToInvoice(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    clientId: row.clientId ?? undefined,
    date: row.date,
    dueDate: row.dueDate ?? undefined,
    status: row.status as Invoice["status"],
    currency: row.currency,
    senderName: row.senderName ?? undefined,
    senderEmail: row.senderEmail ?? undefined,
    senderPhone: row.senderPhone ?? undefined,
    paymentInfo: row.paymentInfo ?? undefined,
    signatureId: row.signatureId ?? undefined,
    notes: row.notes ?? undefined,
    subtotal: row.subtotal,
    tax: row.tax,
    total: row.total,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToItem(row: typeof invoiceItems.$inferSelect): InvoiceItem {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    description: row.description,
    rate: row.rate,
    quantity: row.quantity,
    amount: row.amount,
    sortOrder: row.sortOrder,
  };
}
