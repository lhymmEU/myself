import { nanoid } from "nanoid";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
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

export async function getAllClients(
  userId: string,
): Promise<InvoiceClient[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoiceClients)
    .where(eq(invoiceClients.userId, userId))
    .orderBy(desc(invoiceClients.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    phone: r.phone ?? undefined,
    address: r.address ?? undefined,
    company: r.company ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: Number(r.createdAt),
  }));
}

export async function getClient(
  id: string,
  userId: string,
): Promise<InvoiceClient | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoiceClients)
    .where(
      and(eq(invoiceClients.id, id), eq(invoiceClients.userId, userId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    company: row.company ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: Number(row.createdAt),
  };
}

export async function createClient(
  input: CreateClientInput,
  userId: string,
): Promise<InvoiceClient> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  await db
    .insert(invoiceClients)
    .values({ id, userId, ...input, createdAt: now });
  const result: InvoiceClient = { id, ...input, createdAt: now };
  await eventBus.emit("invoice", INVOICE_EVENTS.CLIENT_CREATED, result);
  return result;
}

export async function updateClient(
  input: UpdateClientInput,
  userId: string,
): Promise<InvoiceClient> {
  const db = getDb();
  const { id, ...data } = input;
  await db
    .update(invoiceClients)
    .set(data)
    .where(
      and(eq(invoiceClients.id, id), eq(invoiceClients.userId, userId)),
    );
  const updated = await getClient(id, userId);
  if (!updated) throw new Error("Client not found");
  return updated;
}

export async function deleteClient(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(invoiceClients)
    .where(
      and(eq(invoiceClients.id, id), eq(invoiceClients.userId, userId)),
    );
  await eventBus.emit("invoice", INVOICE_EVENTS.CLIENT_DELETED, { id });
}

// ── Signatures ──

export async function getAllSignatures(
  userId: string,
): Promise<InvoiceSignature[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoiceSignatures)
    .where(eq(invoiceSignatures.userId, userId))
    .orderBy(desc(invoiceSignatures.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    dataUrl: r.dataUrl,
    isDefault: Boolean(r.isDefault),
    createdAt: Number(r.createdAt),
  }));
}

export async function createSignature(
  input: CreateSignatureInput,
  userId: string,
): Promise<InvoiceSignature> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  if (input.isDefault) {
    await db
      .update(invoiceSignatures)
      .set({ isDefault: false })
      .where(eq(invoiceSignatures.userId, userId));
  }
  await db.insert(invoiceSignatures).values({
    id,
    userId,
    name: input.name,
    dataUrl: input.dataUrl,
    isDefault: input.isDefault ?? false,
    createdAt: now,
  });
  return {
    id,
    name: input.name,
    dataUrl: input.dataUrl,
    isDefault: input.isDefault ?? false,
    createdAt: now,
  };
}

export async function setDefaultSignature(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(invoiceSignatures)
    .set({ isDefault: false })
    .where(eq(invoiceSignatures.userId, userId));
  await db
    .update(invoiceSignatures)
    .set({ isDefault: true })
    .where(
      and(
        eq(invoiceSignatures.id, id),
        eq(invoiceSignatures.userId, userId),
      ),
    );
}

export async function deleteSignature(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .delete(invoiceSignatures)
    .where(
      and(
        eq(invoiceSignatures.id, id),
        eq(invoiceSignatures.userId, userId),
      ),
    );
}

// ── Invoice number ──

export async function getNextInvoiceNumber(
  userId: string,
): Promise<string> {
  const db = getDb();
  const rows = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt))
    .limit(1);
  const latest = rows[0];
  if (!latest) return "INV0001";
  const match = latest.invoiceNumber.match(/INV(\d+)/);
  if (!match) return "INV0001";
  const next = parseInt(match[1], 10) + 1;
  return `INV${String(next).padStart(4, "0")}`;
}

// ── Invoices ──

export async function getAllInvoices(
  userId: string,
): Promise<Invoice[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoices)
    .where(eq(invoices.userId, userId))
    .orderBy(desc(invoices.createdAt));
  return rows.map(rowToInvoice);
}

export async function getInvoice(
  id: string,
  userId: string,
): Promise<InvoiceWithDetails | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)))
    .limit(1);
  const row = rows[0];
  if (!row) return undefined;
  const inv = rowToInvoice(row);

  const itemRows = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));
  const items = itemRows.map(rowToItem);

  let client: InvoiceClient | undefined;
  if (inv.clientId) {
    client = await getClient(inv.clientId, userId);
  }

  let signature: InvoiceSignature | undefined;
  if (inv.signatureId) {
    const sigRows = await db
      .select()
      .from(invoiceSignatures)
      .where(
        and(
          eq(invoiceSignatures.id, inv.signatureId),
          eq(invoiceSignatures.userId, userId),
        ),
      )
      .limit(1);
    const sigRow = sigRows[0];
    if (sigRow) {
      signature = {
        id: sigRow.id,
        name: sigRow.name,
        dataUrl: sigRow.dataUrl,
        isDefault: Boolean(sigRow.isDefault),
        createdAt: Number(sigRow.createdAt),
      };
    }
  }

  return { ...inv, client, items, signature };
}

export async function createInvoice(
  input: CreateInvoiceInput,
  userId: string,
): Promise<InvoiceWithDetails> {
  const db = getDb();
  const id = nanoid();
  const now = Date.now();
  const invoiceNumber =
    input.invoiceNumber || (await getNextInvoiceNumber(userId));

  const subtotal = input.items.reduce((sum, it) => sum + it.amount, 0);
  const tax = input.tax ?? 0;
  const total = subtotal + tax;

  await db.insert(invoices).values({
    id,
    userId,
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
  });

  const items: InvoiceItem[] = [];
  for (let idx = 0; idx < input.items.length; idx++) {
    const it = input.items[idx];
    const itemId = nanoid();
    await db.insert(invoiceItems).values({
      id: itemId,
      invoiceId: id,
      description: it.description,
      rate: it.rate,
      quantity: it.quantity,
      amount: it.amount,
      sortOrder: it.sortOrder ?? idx,
    });
    items.push({
      id: itemId,
      invoiceId: id,
      description: it.description,
      rate: it.rate,
      quantity: it.quantity,
      amount: it.amount,
      sortOrder: it.sortOrder ?? idx,
    });
  }

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
  if (input.clientId) client = await getClient(input.clientId, userId);

  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_CREATED, invoice);
  return { ...invoice, client, items };
}

export async function updateInvoice(
  input: UpdateInvoiceInput,
  userId: string,
): Promise<InvoiceWithDetails> {
  const db = getDb();
  const now = Date.now();

  const existingRows = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, input.id), eq(invoices.userId, userId)))
    .limit(1);
  const existing = existingRows[0];
  if (!existing) throw new Error("Invoice not found");

  if (input.items) {
    await db
      .delete(invoiceItems)
      .where(eq(invoiceItems.invoiceId, input.id));
    for (let idx = 0; idx < input.items.length; idx++) {
      const it = input.items[idx];
      await db.insert(invoiceItems).values({
        id: nanoid(),
        invoiceId: input.id,
        description: it.description,
        rate: it.rate,
        quantity: it.quantity,
        amount: it.amount,
        sortOrder: it.sortOrder ?? idx,
      });
    }
  }

  const subtotal = input.items
    ? input.items.reduce((sum, it) => sum + it.amount, 0)
    : Number(existing.subtotal);
  const tax = input.tax ?? Number(existing.tax);
  const total = subtotal + tax;

  const updateData: Record<string, unknown> = {
    updatedAt: now,
    subtotal,
    tax,
    total,
  };
  if (input.invoiceNumber !== undefined)
    updateData.invoiceNumber = input.invoiceNumber;
  if (input.clientId !== undefined) updateData.clientId = input.clientId;
  if (input.date !== undefined) updateData.date = input.date;
  if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.currency !== undefined) updateData.currency = input.currency;
  if (input.senderName !== undefined)
    updateData.senderName = input.senderName;
  if (input.senderEmail !== undefined)
    updateData.senderEmail = input.senderEmail;
  if (input.senderPhone !== undefined)
    updateData.senderPhone = input.senderPhone;
  if (input.paymentInfo !== undefined)
    updateData.paymentInfo = input.paymentInfo;
  if (input.signatureId !== undefined)
    updateData.signatureId = input.signatureId;
  if (input.notes !== undefined) updateData.notes = input.notes;

  await db
    .update(invoices)
    .set(updateData)
    .where(and(eq(invoices.id, input.id), eq(invoices.userId, userId)));

  const result = await getInvoice(input.id, userId);
  if (!result) throw new Error("Invoice not found after update");
  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_UPDATED, result);
  return result;
}

export async function deleteInvoice(
  id: string,
  userId: string,
): Promise<void> {
  const db = getDb();
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  await eventBus.emit("invoice", INVOICE_EVENTS.INVOICE_DELETED, { id });
}

export async function markInvoiceStatus(
  id: string,
  status: "draft" | "sent" | "paid" | "overdue",
  userId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(invoices)
    .set({ status, updatedAt: Date.now() })
    .where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
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
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    total: Number(row.total),
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
  };
}

function rowToItem(row: typeof invoiceItems.$inferSelect): InvoiceItem {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    description: row.description,
    rate: Number(row.rate),
    quantity: Number(row.quantity),
    amount: Number(row.amount),
    sortOrder: Number(row.sortOrder),
  };
}
