import type { FeatureModule } from "@/lib/core/types";
import { markedTools } from "./tools";

export const markedModule: FeatureModule = {
  name: "marked",
  description: "URL bookmarking organized into shareable collections",
  tools: markedTools,
  eventHandlers: {},
};
