import type { FeatureModule } from "@/lib/core/types";
import { settingsTools } from "./tools";

export const settingsModule: FeatureModule = {
  name: "settings",
  description: "Application settings and configuration management",
  tools: settingsTools,
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
