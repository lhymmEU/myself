import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createHabit,
  logCompletion,
  getHabitStreaks,
} from "./actions";

export const habitTools: AgentTool[] = [
  {
    name: "createHabit",
    description: "Create a new habit with name and optional frequency (daily or weekly)",
    parameters: z.object({
      name: z.string(),
      frequency: z.enum(["daily", "weekly"]).optional(),
      linkedNodeId: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, frequency, linkedNodeId } = params as {
        name: string;
        frequency?: "daily" | "weekly";
        linkedNodeId?: string;
      };
      return createHabit({ name, frequency, linkedNodeId });
    },
  },
  {
    name: "logHabitCompletion",
    description: "Log a completion for a habit on a specific date (YYYY-MM-DD)",
    parameters: z.object({
      id: z.string(),
      date: z.string(),
    }),
    handler: async (params) => {
      const { id, date } = params as { id: string; date: string };
      return logCompletion(id, date);
    },
  },
  {
    name: "getHabitStreaks",
    description: "Get current streak for each habit based on completions",
    parameters: z.object({}),
    handler: async () => {
      return getHabitStreaks();
    },
  },
];
