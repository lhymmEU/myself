import { z } from "zod";

export interface AgentTool {
  name: string;
  description: string;
  parameters: z.ZodType;
  handler: (params: unknown) => Promise<unknown>;
}

export interface EventPayload {
  type: string;
  module: string;
  data: unknown;
  timestamp: number;
}

export type EventHandler = (payload: EventPayload) => void | Promise<void>;

export interface ModuleContext {
  registerTool: (tool: AgentTool) => void;
  subscribe: (eventType: string, handler: EventHandler) => void;
  emit: (type: string, data: unknown) => void;
}

export interface FeatureModule {
  name: string;
  description: string;
  tools: AgentTool[];
  eventHandlers: Record<string, EventHandler>;
  init?: (ctx: ModuleContext) => void;
}
