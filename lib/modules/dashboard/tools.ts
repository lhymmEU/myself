import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  listWishlist,
  createWish,
  updateWish,
  deleteWish,
  listUserSkills,
  createUserSkill,
  listAssignedJobs,
  createAssignedJob,
} from "./actions";

export const dashboardTools: AgentTool[] = [
  {
    name: "listWishlist",
    description: "List all items in the user's skill wishlist",
    parameters: z.object({}),
    handler: async () => listWishlist(),
  },
  {
    name: "createWish",
    description:
      "Add a new item to the user's skill wishlist with name, target level, priority, and notes",
    parameters: z.object({
      name: z.string(),
      targetLevel: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, targetLevel, priority, notes } = params as {
        name: string;
        targetLevel?: number;
        priority?: string;
        notes?: string;
      };
      return createWish({ name, targetLevel, priority, notes });
    },
  },
  {
    name: "updateWish",
    description: "Update an existing wishlist item",
    parameters: z.object({
      id: z.string(),
      name: z.string().optional(),
      targetLevel: z.number().optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
    }),
    handler: async (params) => {
      const { id, ...data } = params as {
        id: string;
        name?: string;
        targetLevel?: number;
        priority?: string;
        notes?: string;
      };
      updateWish(id, data);
      return { success: true };
    },
  },
  {
    name: "deleteWish",
    description: "Delete a wishlist item by id",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      deleteWish(id);
      return { success: true };
    },
  },
  {
    name: "listUserSkills",
    description: "List all of the user's skills with names, levels, and categories",
    parameters: z.object({}),
    handler: async () => listUserSkills(),
  },
  {
    name: "createUserSkill",
    description: "Add a new skill to the user's skill list",
    parameters: z.object({
      name: z.string(),
      level: z.number().optional(),
      category: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, level, category } = params as {
        name: string;
        level?: number;
        category?: string;
      };
      return createUserSkill({ name, level, category });
    },
  },
  {
    name: "listAssignedJobs",
    description: "List all jobs assigned to the Claw agent",
    parameters: z.object({}),
    handler: async () => listAssignedJobs(),
  },
  {
    name: "createAssignedJob",
    description: "Create a new job assignment for the Claw agent",
    parameters: z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, description } = params as {
        name: string;
        description?: string;
      };
      return createAssignedJob({ name, description });
    },
  },
];
