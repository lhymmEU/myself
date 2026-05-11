import type { FeatureModule } from "@/lib/core/types";

export const markedModule: FeatureModule = {
  name: "marked",
  description: "URL bookmarking organized into shareable collections",
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
