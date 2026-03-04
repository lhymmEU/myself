import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getSetting, updateSetting, getAllSettings } from "./actions";

export const settingsTools: AgentTool[] = [
  {
    name: "getSetting",
    description: "Get a setting value by key",
    parameters: z.object({ key: z.string() }),
    handler: async (params) => {
      const { key } = params as { key: string };
      return { key, value: getSetting(key) };
    },
  },
  {
    name: "updateSetting",
    description: "Update a setting value",
    parameters: z.object({ key: z.string(), value: z.string() }),
    handler: async (params) => {
      const { key, value } = params as { key: string; value: string };
      await updateSetting(key, value);
      return { success: true, key, value };
    },
  },
  {
    name: "getAllSettings",
    description: "Get all current settings",
    parameters: z.object({}),
    handler: async () => {
      return await getAllSettings();
    },
  },
];
