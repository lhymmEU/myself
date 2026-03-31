import type { FeatureModule } from "@/lib/core/types";
import { financeTools } from "./tools";

export const financeModule: FeatureModule = {
  name: "finance",
  description:
    "Financial market data powered by OpenBB — stocks, crypto, economy indicators, and news",
  tools: financeTools,
  eventHandlers: {},
};
