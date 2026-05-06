import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import type { SkillLevel } from "./schema";
import {
  listWishlist,
  createWish,
  updateWish,
  deleteWish,
  listUserSkills,
  createUserSkill,
  listWishTodos,
  bulkCreateWishTodos,
} from "./actions";

const skillLevelEnum = z.enum(["familiar", "fluent", "mastering"]);

export const dashboardTools: AgentTool[] = [
  {
    name: "listWishlist",
    description: "List all items in the user's skill wishlist",
    parameters: z.object({}),
    handler: async () => await listWishlist(),
  },
  {
    name: "createWish",
    description:
      "Add a new item to the user's skill wishlist. The wishlist is capped at 3 items — if full, the user must finish existing skills first.",
    parameters: z.object({
      name: z.string(),
      targetLevel: skillLevelEnum.optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, targetLevel, priority, notes } = params as {
        name: string;
        targetLevel?: SkillLevel;
        priority?: string;
        notes?: string;
      };
      try {
        return await createWish({ name, targetLevel, priority, notes });
      } catch (e) {
        if (e instanceof Error && e.message === "wishlist_full") {
          return { error: "wishlist_full", message: "The wishlist already has 3 items. The user must complete or remove existing skills before adding new ones." };
        }
        throw e;
      }
    },
  },
  {
    name: "updateWish",
    description: "Update an existing wishlist item",
    parameters: z.object({
      id: z.string(),
      name: z.string().optional(),
      targetLevel: skillLevelEnum.optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      notes: z.string().optional(),
    }),
    handler: async (params) => {
      const { id, ...data } = params as {
        id: string;
        name?: string;
        targetLevel?: SkillLevel;
        priority?: string;
        notes?: string;
      };
      await updateWish(id, data);
      return { success: true };
    },
  },
  {
    name: "deleteWish",
    description: "Delete a wishlist item by id",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      await deleteWish(id);
      return { success: true };
    },
  },
  {
    name: "listUserSkills",
    description: "List all of the user's skills with names, levels (familiar/fluent/mastering), and categories",
    parameters: z.object({}),
    handler: async () => await listUserSkills(),
  },
  {
    name: "createUserSkill",
    description: "Add a new skill to the user's skill list. Level must be one of: familiar, fluent, mastering.",
    parameters: z.object({
      name: z.string(),
      level: skillLevelEnum.optional(),
      category: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, level, category } = params as {
        name: string;
        level?: SkillLevel;
        category?: string;
      };
      return await createUserSkill({ name, level, category });
    },
  },
  {
    name: "generateWishTodos",
    description:
      "Generate up to 5 actionable todo steps for a wishlist item to help the user reach their target skill level. Provide the wish ID and an array of todo content strings. This replaces any existing todos for that wish.",
    parameters: z.object({
      wishId: z.string(),
      todos: z.array(z.string()).min(1).max(5),
    }),
    handler: async (params) => {
      const { wishId, todos } = params as { wishId: string; todos: string[] };
      return await bulkCreateWishTodos(wishId, todos);
    },
  },
  {
    name: "listWishTodos",
    description: "List all todos for a specific wishlist item",
    parameters: z.object({ wishId: z.string() }),
    handler: async (params) => {
      const { wishId } = params as { wishId: string };
      return await listWishTodos(wishId);
    },
  },
];
