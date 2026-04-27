import type { FeatureModule } from "@/lib/core/types";
import { mindMapTools } from "./tools";

export const mindMapModule: FeatureModule = {
  name: "mind-map",
  description: "Excalidraw-powered canvas for freeform visual thinking",
  tools: mindMapTools,
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
