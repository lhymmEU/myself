import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createPlan,
  updatePlan,
  getAllPlans,
  getPlan,
} from "./actions";

export const planTools: AgentTool[] = [
  {
    name: "createPlanPage",
    description: "Create a new plan page with title and optional TipTap content",
    parameters: z.object({
      title: z.string(),
      content: z.unknown().optional(),
      linkedNodeId: z.string().optional(),
    }),
    handler: async (params) => {
      const { title, content, linkedNodeId } = params as {
        title: string;
        content?: unknown;
        linkedNodeId?: string;
      };
      return createPlan({ title, content, linkedNodeId });
    },
  },
  {
    name: "updatePlanPage",
    description: "Update an existing plan page",
    parameters: z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.unknown().optional(),
      linkedNodeId: z.string().optional().nullable(),
    }),
    handler: async (params) => {
      const { id, title, content, linkedNodeId } = params as {
        id: string;
        title?: string;
        content?: unknown;
        linkedNodeId?: string | null;
      };
      return updatePlan({ id, title, content, linkedNodeId });
    },
  },
  {
    name: "queryPlanPages",
    description: "Query plan pages - get all or a specific plan by id",
    parameters: z.object({
      id: z.string().optional(),
    }),
    handler: async (params) => {
      const { id } = params as { id?: string };
      if (id) {
        const plan = getPlan(id);
        return plan ?? { error: "Plan not found" };
      }
      return getAllPlans();
    },
  },
];
