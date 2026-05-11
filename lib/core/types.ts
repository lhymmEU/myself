import type { DeploymentMode } from "./runtime";

export interface EventPayload {
  type: string;
  module: string;
  data: unknown;
  timestamp: number;
}

export type EventHandler = (payload: EventPayload) => void | Promise<void>;

export interface ModuleContext {
  subscribe: (eventType: string, handler: EventHandler) => void;
  emit: (type: string, data: unknown) => void;
}

export interface FeatureModule {
  name: string;
  description: string;
  eventHandlers: Record<string, EventHandler>;
  init?: (ctx: ModuleContext) => void;
  /**
   * Deployment modes this module is available in. Defaults to both modes
   * when omitted to preserve backwards-compatibility for unmigrated modules.
   */
  availableIn?: DeploymentMode[];
}
