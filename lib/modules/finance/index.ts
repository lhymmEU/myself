import type { FeatureModule } from "@/lib/core/types";
import { financeTools } from "./tools";

export const financeModule: FeatureModule = {
  name: "finance",
  description:
    "Personal finance + market data (market intelligence is local-only via OpenBB)",
  tools: financeTools,
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
