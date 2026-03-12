import type { FeatureModule } from "@/lib/core/types";
import { invoiceTools } from "./tools";

export const invoiceModule: FeatureModule = {
  name: "invoice",
  description: "Create and manage invoices, clients, and signatures",
  tools: invoiceTools,
  eventHandlers: {},
};
