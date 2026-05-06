import { initDatabase } from "./init-db";
import { moduleRegistry } from "./module-registry";
import { mindMapModule } from "@/lib/modules/mind-map";
import { todosModule } from "@/lib/modules/todos";
import { financeModule } from "@/lib/modules/finance";
import { plansModule } from "@/lib/modules/plans";
import { settingsModule } from "@/lib/modules/settings";
import { vaultModule } from "@/lib/modules/vault";
import { invoiceModule } from "@/lib/modules/invoice";
import { dashboardModule } from "@/lib/modules/dashboard";
import { markedModule } from "@/lib/modules/marked";

let booted = false;

export function bootApp() {
  if (booted) return;

  initDatabase();

  moduleRegistry.register(mindMapModule);
  moduleRegistry.register(todosModule);
  moduleRegistry.register(financeModule);
  moduleRegistry.register(plansModule);
  moduleRegistry.register(settingsModule);
  moduleRegistry.register(vaultModule);
  moduleRegistry.register(invoiceModule);
  moduleRegistry.register(dashboardModule);
  moduleRegistry.register(markedModule);

  moduleRegistry.initAll();
  booted = true;
}
