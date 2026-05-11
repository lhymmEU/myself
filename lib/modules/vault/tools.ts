import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import { getAgentToolUserId } from "@/lib/core/agent-tool-context";
import {
  getAllSecrets,
  getSecret,
  createSecret,
  deleteSecret,
  getVaultStatus,
} from "./actions";

export const vaultTools: AgentTool[] = [
  {
    name: "getVaultStatus",
    description: "Check if the vault is initialized, locked/unlocked, and how many secrets it holds",
    parameters: z.object({}),
    handler: async () => {
      return await getVaultStatus(getAgentToolUserId());
    },
  },
  {
    name: "listVaultSecrets",
    description: "List all secrets in the vault (names and categories only, no values)",
    parameters: z.object({}),
    handler: async () => {
      return await getAllSecrets(getAgentToolUserId());
    },
  },
  {
    name: "getVaultSecret",
    description: "Get a specific secret by ID, including its decrypted value",
    parameters: z.object({
      id: z.string(),
    }),
    handler: async (params) => {
      const { id } = params as { id: string };
      return await getSecret(id, getAgentToolUserId());
    },
  },
  {
    name: "createVaultSecret",
    description: "Store a new secret in the vault with post-quantum encryption",
    parameters: z.object({
      name: z.string(),
      value: z.string(),
      category: z
        .enum([
          "password",
          "api_key",
          "credential",
          "note",
          "certificate",
          "ssh_key",
          "crypto_wallet",
          "other",
        ])
        .optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    handler: async (params) => {
      const { name, value, category, notes, tags } = params as {
        name: string;
        value: string;
        category?: string;
        notes?: string;
        tags?: string[];
      };
      return await createSecret(
        {
          name,
          value,
          category: category as Parameters<typeof createSecret>[0]["category"],
          notes,
          tags,
        },
        getAgentToolUserId(),
      );
    },
  },
  {
    name: "deleteVaultSecret",
    description: "Delete a secret from the vault by ID",
    parameters: z.object({
      id: z.string(),
    }),
    handler: async (params) => {
      const { id } = params as { id: string };
      await deleteSecret(id, getAgentToolUserId());
      return { success: true };
    },
  },
];
