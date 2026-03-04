import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createGoal,
  updateGoal,
  completeMilestone,
} from "./actions";

const milestoneSchema = z.object({
  title: z.string(),
  completed: z.boolean(),
});

export const goalTools: AgentTool[] = [
  {
    name: "createGoal",
    description: "Create a new goal with title, target date, and optional milestones",
    parameters: z.object({
      title: z.string(),
      targetDate: z.string(),
      milestones: z.array(milestoneSchema).optional(),
      linkedNodeId: z.string().optional(),
    }),
    handler: async (params) => {
      const { title, targetDate, milestones, linkedNodeId } = params as {
        title: string;
        targetDate: string;
        milestones?: Array<{ title: string; completed: boolean }>;
        linkedNodeId?: string;
      };
      return createGoal({ title, targetDate, milestones, linkedNodeId });
    },
  },
  {
    name: "updateGoalProgress",
    description: "Update a goal's progress (0-100), title, target date, or milestones",
    parameters: z.object({
      id: z.string(),
      title: z.string().optional(),
      targetDate: z.string().optional(),
      progress: z.number().min(0).max(100).optional(),
      milestones: z.array(milestoneSchema).optional(),
    }),
    handler: async (params) => {
      const { id, title, targetDate, progress, milestones } = params as {
        id: string;
        title?: string;
        targetDate?: string;
        progress?: number;
        milestones?: Array<{ title: string; completed: boolean }>;
      };
      return updateGoal({ id, title, targetDate, progress, milestones });
    },
  },
  {
    name: "completeMilestone",
    description: "Mark a milestone as completed by its index (0-based)",
    parameters: z.object({
      goalId: z.string(),
      milestoneIndex: z.number().int().min(0),
    }),
    handler: async (params) => {
      const { goalId, milestoneIndex } = params as {
        goalId: string;
        milestoneIndex: number;
      };
      return completeMilestone(goalId, milestoneIndex);
    },
  },
];
