import type { FeatureModule } from "@/lib/core/types";

export const financeModule: FeatureModule = {
  name: "finance",
  description:
    "Personal finance + market data (market intelligence is local-only via OpenBB)",
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
