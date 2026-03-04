import { toolRegistry } from "@/lib/core/tool-registry";
import { zodToJsonSchema } from "./schemas";
import type { AgentTool } from "@/lib/core/types";

export interface OpenAIFunctionDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function toOpenAIFunctions(): OpenAIFunctionDef[] {
  return toolRegistry.getAll().map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: zodToJsonSchema(tool.parameters),
    },
  }));
}

export interface MCPToolDescriptor {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export function toMCPTools(): MCPToolDescriptor[] {
  return toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: zodToJsonSchema(tool.parameters),
  }));
}

export function getToolByName(name: string): AgentTool | undefined {
  return toolRegistry.get(name);
}
