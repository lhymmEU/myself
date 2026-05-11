import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import {
  createPlan,
  updatePlan,
  getAllPlans,
  getPlan,
  getPlanByLinkedNode,
} from "./actions";
import {
  attachMarkedItem,
  detachMarkedItem,
  listPlanAttachments,
} from "./attachments";

export const planTools: AgentTool[] = [
  {
    name: "createPlanPage",
    description:
      "Create a new plan page with title and optional BlockNote content. Pass linkedNodeId when drafting from a mind-map todo so the plan can be located again.",
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
      const uid = getAgentToolUserId();
      return await createPlan({ title, content, linkedNodeId }, uid);
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
      const uid = getAgentToolUserId();
      return await updatePlan({ id, title, content, linkedNodeId }, uid);
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
      const uid = getAgentToolUserId();
      if (id) {
        const plan = await getPlan(id, uid);
        return plan ?? { error: "Plan not found" };
      }
      return await getAllPlans(uid);
    },
  },
  {
    name: "queryPlanByLinkedNode",
    description:
      "Look up a plan page by the mind-map element id it was generated from. Returns null when no plan exists yet — use this before deciding whether to call createPlanPage or updatePlanPage for a given todo.",
    parameters: z.object({
      linkedNodeId: z.string(),
    }),
    handler: async (params) => {
      const { linkedNodeId } = params as { linkedNodeId: string };
      const plan = await getPlanByLinkedNode(
        linkedNodeId,
        getAgentToolUserId(),
      );
      return plan ?? { plan: null };
    },
  },
  {
    name: "attachMarkedItemToPlan",
    description:
      "Attach a marked item (bookmark) to a plan page so the user can keep it as a quick-reference link.",
    parameters: z.object({
      planId: z.string(),
      markedItemId: z.string(),
    }),
    handler: async (params) => {
      const { planId, markedItemId } = params as {
        planId: string;
        markedItemId: string;
      };
      return await attachMarkedItem(
        { planId, markedItemId },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "detachMarkedItemFromPlan",
    description: "Remove a marked item from a plan page's attachments.",
    parameters: z.object({
      planId: z.string(),
      markedItemId: z.string(),
    }),
    handler: async (params) => {
      const { planId, markedItemId } = params as {
        planId: string;
        markedItemId: string;
      };
      await detachMarkedItem(
        { planId, markedItemId },
        getAgentToolUserId(),
      );
      return { ok: true };
    },
  },
  {
    name: "listPlanAttachments",
    description:
      "List the marked items currently attached to a plan page, ordered by their attachment sortOrder.",
    parameters: z.object({
      planId: z.string(),
    }),
    handler: async (params) => {
      const { planId } = params as { planId: string };
      return await listPlanAttachments(planId, getAgentToolUserId());
    },
  },
];
