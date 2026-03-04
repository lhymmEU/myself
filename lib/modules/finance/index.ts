import type { FeatureModule } from "@/lib/core/types";
import { financeTools } from "./tools";

export const financeModule: FeatureModule = {
  name: "finance",
  description: "Personal finance tracking with transactions and budgets",
  tools: financeTools,
  eventHandlers: {},
};
