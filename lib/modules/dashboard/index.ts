import type { FeatureModule } from "@/lib/core/types";
import { insightEventHandlers } from "./insights-events";

export const dashboardModule: FeatureModule = {
  name: "dashboard",
  description:
    "Dashboard features: skills + wishes (raw layer) and bento wiki ingest via OpenClaw + Supabase.",
  eventHandlers: insightEventHandlers,
};
