import type { FeatureModule } from "@/lib/core/types";

export const clawModule: FeatureModule = {
  name: "claw",
  description: "OpenClaw remote management panel — SSH (local) or E2E relay (cloud)",
  tools: [],
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
