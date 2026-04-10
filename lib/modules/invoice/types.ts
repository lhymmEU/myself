export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  createdAt: number;
}

export interface CreateClientInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
}

export interface UpdateClientInput extends Partial<CreateClientInput> {
  id: string;
}

export interface InvoiceSignature {
  id: string;
  name: string;
  dataUrl: string;
  isDefault: boolean;
  createdAt: number;
}

export interface CreateSignatureInput {
  name: string;
  dataUrl: string;
  isDefault?: boolean;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  rate: number;
  quantity: number;
  amount: number;
  sortOrder: number;
}

export interface CreateInvoiceItemInput {
  description: string;
  rate: number;
  quantity: number;
  amount: number;
  sortOrder?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId?: string;
  date: string;
  dueDate?: string;
  status: InvoiceStatus;
  currency: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  paymentInfo?: string;
  signatureId?: string;
  notes?: string;
  subtotal: number;
  tax: number;
  total: number;
  createdAt: number;
  updatedAt: number;
}

export interface InvoiceWithDetails extends Invoice {
  client?: InvoiceClient;
  items: InvoiceItem[];
  signature?: InvoiceSignature;
}

export interface CreateInvoiceInput {
  invoiceNumber?: string;
  clientId?: string;
  date: string;
  dueDate?: string;
  currency?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  paymentInfo?: string;
  signatureId?: string;
  notes?: string;
  tax?: number;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  id: string;
  invoiceNumber?: string;
  clientId?: string;
  date?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  currency?: string;
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  paymentInfo?: string;
  signatureId?: string;
  notes?: string;
  tax?: number;
  items?: CreateInvoiceItemInput[];
}
