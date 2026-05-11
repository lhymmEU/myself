import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import {
  createInvoice,
  getAllInvoices,
  getInvoice,
  createClient,
  getAllClients,
} from "./actions";

export const invoiceTools: AgentTool[] = [
  {
    name: "createInvoice",
    description: "Create a new invoice with line items",
    parameters: z.object({
      clientId: z.string().optional(),
      date: z.string(),
      dueDate: z.string().optional(),
      currency: z.string().optional(),
      senderName: z.string().optional(),
      senderEmail: z.string().optional(),
      senderPhone: z.string().optional(),
      paymentInfo: z.string().optional(),
      notes: z.string().optional(),
      tax: z.number().optional(),
      items: z.array(
        z.object({
          description: z.string(),
          rate: z.number(),
          quantity: z.number(),
          amount: z.number(),
        })
      ),
    }),
    handler: async (params) => {
      const uid = getAgentToolUserId();
      return await createInvoice(
        params as Parameters<typeof createInvoice>[0],
        uid,
      );
    },
  },
  {
    name: "listInvoices",
    description: "List all invoices",
    parameters: z.object({}),
    handler: async () => {
      return await getAllInvoices(getAgentToolUserId());
    },
  },
  {
    name: "getInvoice",
    description: "Get a single invoice with full details including items and client",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      return await getInvoice(id, getAgentToolUserId());
    },
  },
  {
    name: "createInvoiceClient",
    description: "Create a new invoice client",
    parameters: z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      company: z.string().optional(),
    }),
    handler: async (params) => {
      return await createClient(
        params as Parameters<typeof createClient>[0],
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "listInvoiceClients",
    description: "List all invoice clients",
    parameters: z.object({}),
    handler: async () => {
      return await getAllClients(getAgentToolUserId());
    },
  },
];
