import { initDatabase } from "./init-db";
import { moduleRegistry } from "./module-registry";
import { mindMapModule } from "@/lib/modules/mind-map";
import { todosModule } from "@/lib/modules/todos";
import { financeModule } from "@/lib/modules/finance";
import { plansModule } from "@/lib/modules/plans";
import { habitsModule } from "@/lib/modules/habits";
import { goalsModule } from "@/lib/modules/goals";
import { settingsModule } from "@/lib/modules/settings";
import { vaultModule } from "@/lib/modules/vault";

let booted = false;

export function bootApp() {
  if (booted) return;

  initDatabase();

  moduleRegistry.register(mindMapModule);
  moduleRegistry.register(todosModule);
  moduleRegistry.register(financeModule);
  moduleRegistry.register(plansModule);
  moduleRegistry.register(habitsModule);
  moduleRegistry.register(goalsModule);
  moduleRegistry.register(settingsModule);
  moduleRegistry.register(vaultModule);

  moduleRegistry.initAll();
  booted = true;
}
