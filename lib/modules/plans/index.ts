import type { FeatureModule } from "@/lib/core/types";
import { planTools } from "./tools";

export const plansModule: FeatureModule = {
  name: "plans",
  description: "Plan pages with TipTap content and mind-map linking",
  tools: planTools,
  eventHandlers: {},
};
