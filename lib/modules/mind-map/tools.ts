import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import {
  getOrCreateDefaultScene,
  getAllScenes,
  updateScene,
} from "./actions";

export const mindMapTools: AgentTool[] = [
  {
    name: "getMindMapScene",
    description:
      "Get the current mind map scene (Excalidraw elements and state)",
    parameters: z.object({
      id: z.string().optional(),
    }),
    handler: async (params) => {
      const { id } = params as { id?: string };
      const uid = getAgentToolUserId();
      if (id) {
        const { getScene } = await import("./actions");
        const scene = await getScene(id, uid);
        if (!scene) throw new Error(`Scene not found: ${id}`);
        return scene;
      }
      return await getOrCreateDefaultScene(uid);
    },
  },
  {
    name: "listMindMapScenes",
    description: "List all mind map scenes",
    parameters: z.object({}),
    handler: async () => {
      return await getAllScenes(undefined, getAgentToolUserId());
    },
  },
  {
    name: "updateMindMapScene",
    description: "Update a mind map scene's name or content",
    parameters: z.object({
      id: z.string(),
      name: z.string().optional(),
      elements: z.string().optional(),
      appState: z.string().optional(),
    }),
    handler: async (params) => {
      const { id, name, elements, appState } = params as {
        id: string;
        name?: string;
        elements?: string;
        appState?: string;
      };
      return await updateScene(
        { id, name, elements, appState },
        getAgentToolUserId(),
      );
    },
  },
];
