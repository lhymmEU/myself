import type { FeatureModule } from "@/lib/core/types";

export const settingsModule: FeatureModule = {
  name: "settings",
  description: "Application settings and configuration management",
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
