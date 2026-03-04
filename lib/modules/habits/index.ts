import type { FeatureModule } from "@/lib/core/types";
import { habitTools } from "./tools";

export const habitsModule: FeatureModule = {
  name: "habits",
  description: "Habit tracking with daily/weekly frequency and streak calculation",
  tools: habitTools,
  eventHandlers: {},
};
