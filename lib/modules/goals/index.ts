import type { FeatureModule } from "@/lib/core/types";
import { goalTools } from "./tools";

export const goalsModule: FeatureModule = {
  name: "goals",
  description: "Goals with target dates, progress tracking, and milestones",
  tools: goalTools,
  eventHandlers: {},
};
