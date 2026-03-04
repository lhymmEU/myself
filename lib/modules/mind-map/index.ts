import type { FeatureModule } from "@/lib/core/types";
import { mindMapTools } from "./tools";

export const mindMapModule: FeatureModule = {
  name: "mind-map",
  description: "Interactive mind map for organizing life aspects",
  tools: mindMapTools,
  eventHandlers: {},
};
