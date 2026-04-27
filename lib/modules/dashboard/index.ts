import type { FeatureModule } from "@/lib/core/types";
import { dashboardTools } from "./tools";

export const dashboardModule: FeatureModule = {
  name: "dashboard",
  description: "Dashboard features: user skills, wishlist, and assigned jobs",
  tools: dashboardTools,
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
