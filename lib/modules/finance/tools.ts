import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createTransaction,
  getTransactionsByDateRange,
  getFinancialSummary,
  setBudget,
} from "./actions";

export const financeTools: AgentTool[] = [
  {
    name: "addTransaction",
    description: "Add a new income, expense, or investment transaction",
    parameters: z.object({
      type: z.enum(["income", "expense", "investment"]),
      amount: z.number(),
      category: z.string(),
      description: z.string().optional(),
      date: z.string(),
      recurring: z.boolean().optional(),
      linkedNodeId: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async (params) => {
      return await createTransaction(params as Parameters<typeof createTransaction>[0]);
    },
  },
  {
    name: "queryTransactions",
    description: "Get transactions within a date range",
    parameters: z.object({
      start: z.string(),
      end: z.string(),
    }),
    handler: async (params) => {
      const { start, end } = params as { start: string; end: string };
      return await getTransactionsByDateRange(start, end);
    },
  },
  {
    name: "getFinancialSummary",
    description: "Get financial summary with totals and savings rate",
    parameters: z.object({}),
    handler: async () => {
      return await getFinancialSummary();
    },
  },
  {
    name: "setBudget",
    description: "Create or update a budget for a category",
    parameters: z.object({
      category: z.string(),
      amount: z.number(),
      period: z.enum(["weekly", "monthly"]).optional(),
    }),
    handler: async (params) => {
      const { category, amount, period } = params as {
        category: string;
        amount: number;
        period?: "weekly" | "monthly";
      };
      return await setBudget(category, amount, period);
    },
  },
];
