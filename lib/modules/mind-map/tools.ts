import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createNode,
  getAllNodes,
  getNode,
  updateNode,
  connectNodes,
  deleteNode,
} from "./actions";

export const mindMapTools: AgentTool[] = [
  {
    name: "addMindMapNode",
    description: "Add a new node to the mind map",
    parameters: z.object({
      label: z.string(),
      type: z.enum(["category", "item"]),
      parentId: z.string().optional().nullable(),
      color: z.string().optional(),
      positionX: z.number().optional(),
      positionY: z.number().optional(),
    }),
    handler: async (params) => {
      const { label, type, parentId, color, positionX, positionY } = params as {
        label: string;
        type: "category" | "item";
        parentId?: string | null;
        color?: string;
        positionX?: number;
        positionY?: number;
      };
      return createNode({
        label,
        type,
        parentId,
        color,
        positionX,
        positionY,
      });
    },
  },
  {
    name: "getMindMapState",
    description: "Get the current state of all nodes in the mind map",
    parameters: z.object({}),
    handler: async () => {
      return getAllNodes();
    },
  },
  {
    name: "updateNodeMetadata",
    description: "Update metadata for a mind map node (merges with existing)",
    parameters: z.object({
      id: z.string(),
      metadata: z.record(z.string(), z.unknown()),
    }),
    handler: async (params) => {
      const { id, metadata } = params as {
        id: string;
        metadata: Record<string, unknown>;
      };
      const existing = getNode(id);
      if (!existing) throw new Error(`Node not found: ${id}`);
      const merged = { ...existing.metadata, ...metadata };
      return updateNode({ id, metadata: merged });
    },
  },
  {
    name: "connectNodes",
    description: "Create a connection between two mind map nodes",
    parameters: z.object({
      sourceId: z.string(),
      targetId: z.string(),
    }),
    handler: async (params) => {
      const { sourceId, targetId } = params as {
        sourceId: string;
        targetId: string;
      };
      return connectNodes(sourceId, targetId);
    },
  },
  {
    name: "deleteNode",
    description: "Delete a node from the mind map",
    parameters: z.object({
      id: z.string(),
    }),
    handler: async (params) => {
      const { id } = params as { id: string };
      deleteNode(id);
      return { success: true, id };
    },
  },
];
