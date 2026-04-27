import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getTodoSourceScene } from "@/lib/modules/mind-map/actions";
import { parseMindMapTodos } from "./parse-mind-map";

export const todoTools: AgentTool[] = [
  {
    name: "queryTodos",
    description:
      "Query todos derived from the mind map canvas marked as todo source. Optionally filter to urgent-only.",
    parameters: z.object({
      urgentOnly: z.boolean().optional(),
    }),
    handler: async (params) => {
      const { urgentOnly } = params as { urgentOnly?: boolean };
      const scene = await getTodoSourceScene();
      if (!scene) return [];
      let elements: unknown[] = [];
      try {
        elements = JSON.parse(scene.elements);
      } catch {
        /* empty scene */
      }
      const todos = parseMindMapTodos(
        elements as Parameters<typeof parseMindMapTodos>[0]
      );
      if (urgentOnly) return todos.filter((t) => t.isUrgent);
      return todos;
    },
  },
];
