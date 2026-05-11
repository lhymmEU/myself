import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import type { SkillLevel } from "./schema";
import {
  listUserWishes,
  createUserWish,
  updateUserWishPlanData,
  deleteUserWish,
  listUserSkills,
  createUserSkill,
} from "./actions";
import { normalizeToFlatStringRecord } from "@/lib/wishlist/parse-plan";

const skillLevelEnum = z.enum(["familiar", "fluent", "mastering"]);
const wishCategoryEnum = z.enum(["learn", "place", "goal"]);

export const dashboardTools: AgentTool[] = [
  {
    name: "listUserWishes",
    description:
      "List all user wishes (things to learn, places to go, goals). Each has category, userDescription, and planData as a JSON string of flat key→string entries.",
    parameters: z.object({}),
    handler: async () => await listUserWishes(getAgentToolUserId()),
  },
  {
    name: "createUserWish",
    description:
      "Create a wish with category (learn | place | goal), userDescription, and planData as a flat object with string values only (e.g. title, summary, step_1, step_2).",
    parameters: z.object({
      category: wishCategoryEnum,
      userDescription: z.string(),
      planData: z.record(z.string(), z.unknown()),
    }),
    handler: async (params) => {
      const { category, userDescription, planData } = params as {
        category: "learn" | "place" | "goal";
        userDescription: string;
        planData: Record<string, unknown>;
      };
      const flat = normalizeToFlatStringRecord(planData);
      return await createUserWish(
        { category, userDescription, planData: flat },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "updateUserWishPlan",
    description:
      "Replace the stored plan JSON for a wish (flat string map). Pass the full plan object.",
    parameters: z.object({
      id: z.string(),
      planData: z.record(z.string(), z.unknown()),
    }),
    handler: async (params) => {
      const { id, planData } = params as {
        id: string;
        planData: Record<string, unknown>;
      };
      const normalized = normalizeToFlatStringRecord(planData);
      await updateUserWishPlanData(id, normalized, getAgentToolUserId());
      return { success: true };
    },
  },
  {
    name: "deleteUserWish",
    description: "Delete a user wish by id",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      await deleteUserWish(id, getAgentToolUserId());
      return { success: true };
    },
  },
  {
    name: "listUserSkills",
    description: "List all of the user's skills with names, levels (familiar/fluent/mastering), and categories",
    parameters: z.object({}),
    handler: async () => await listUserSkills(getAgentToolUserId()),
  },
  {
    name: "createUserSkill",
    description:
      "Add a new skill to the user's skill list. Level must be one of: familiar, fluent, mastering.",
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
      return await createUserSkill(
        { name, level, category },
        getAgentToolUserId(),
      );
    },
  },
];
