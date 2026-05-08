import type { FeatureModule } from "@/lib/core/types";
import { dashboardTools } from "./tools";
import { dashboardWikiTools } from "./insights-tools";
import { insightEventHandlers } from "./insights-events";

export const dashboardModule: FeatureModule = {
  name: "dashboard",
  description:
    "Dashboard features: skills + wishlist (raw layer) and the bento LLM-wiki tools openclaw uses to read/write data/wiki/ and publish the bento card payload.",
  tools: [...dashboardTools, ...dashboardWikiTools],
  eventHandlers: insightEventHandlers,
  availableIn: ["local", "cloud"],
};
