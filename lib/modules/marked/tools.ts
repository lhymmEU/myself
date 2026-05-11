import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import {
  createCollection,
  updateCollection,
  listCollections,
  getCollection,
  createItem,
  updateItem,
  listItems,
  getItem,
  fetchUrlMeta,
} from "./actions";

export const markedTools: AgentTool[] = [
  {
    name: "createMarkedCollection",
    description: "Create a new bookmark collection with a name and optional notes",
    parameters: z.object({
      name: z.string(),
      notes: z.string().optional(),
    }),
    handler: async (params) => {
      const { name, notes } = params as { name: string; notes?: string };
      return await createCollection({ name, notes }, getAgentToolUserId());
    },
  },
  {
    name: "updateMarkedCollection",
    description: "Update an existing bookmark collection",
    parameters: z.object({
      id: z.string(),
      name: z.string().optional(),
      notes: z.string().optional().nullable(),
    }),
    handler: async (params) => {
      const { id, name, notes } = params as {
        id: string;
        name?: string;
        notes?: string | null;
      };
      return await updateCollection(
        { id, name, notes },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "queryMarkedCollections",
    description: "List all bookmark collections or get one by id",
    parameters: z.object({
      id: z.string().optional(),
    }),
    handler: async (params) => {
      const { id } = params as { id?: string };
      const uid = getAgentToolUserId();
      if (id) {
        const c = await getCollection(id, uid);
        return c ?? { error: "Collection not found" };
      }
      return await listCollections(uid);
    },
  },
  {
    name: "createMarkedItem",
    description:
      "Bookmark a URL. Auto-fetches metadata if title is not provided.",
    parameters: z.object({
      url: z.string(),
      title: z.string().optional(),
      notes: z.string().optional(),
      collectionId: z.string().optional(),
    }),
    handler: async (params) => {
      const { url, title, notes, collectionId } = params as {
        url: string;
        title?: string;
        notes?: string;
        collectionId?: string;
      };
      let finalTitle = title ?? "";
      let meta;
      if (!finalTitle) {
        meta = await fetchUrlMeta(url);
        finalTitle = meta.title || url;
      }
      return await createItem(
        {
          url,
          title: finalTitle,
          notes,
          collectionId,
          favicon: meta?.favicon,
          ogImage: meta?.image,
          ogDescription: meta?.description,
          sourceTag: meta?.sourceTag,
        },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "updateMarkedItem",
    description: "Update an existing bookmark",
    parameters: z.object({
      id: z.string(),
      title: z.string().optional(),
      notes: z.string().optional().nullable(),
      collectionId: z.string().optional().nullable(),
    }),
    handler: async (params) => {
      const { id, title, notes, collectionId } = params as {
        id: string;
        title?: string;
        notes?: string | null;
        collectionId?: string | null;
      };
      return await updateItem(
        { id, title, notes, collectionId },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "queryMarkedItems",
    description:
      "List bookmarks, optionally filtered by collection id. Pass collectionId='__uncollected__' for items without a collection.",
    parameters: z.object({
      collectionId: z.string().optional(),
      id: z.string().optional(),
    }),
    handler: async (params) => {
      const { collectionId, id } = params as {
        collectionId?: string;
        id?: string;
      };
      const uid = getAgentToolUserId();
      if (id) {
        const item = await getItem(id, uid);
        return item ?? { error: "Item not found" };
      }
      return await listItems(collectionId, uid);
    },
  },
];
