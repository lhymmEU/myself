import type { FeatureModule, ModuleContext } from "./types";
import { eventBus } from "./event-bus";
import { MODE, isModuleAvailable } from "./runtime";

class ModuleRegistry {
  private modules: Map<string, FeatureModule> = new Map();
  private initialized = false;

  register(mod: FeatureModule) {
    if (!isModuleAvailable({ name: mod.name, availableIn: mod.availableIn ?? ["local", "cloud"] })) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          `[module-registry] skipping "${mod.name}" — not available in mode "${MODE}"`,
        );
      }
      return;
    }
    this.modules.set(mod.name, mod);
  }

  initAll() {
    if (this.initialized) return;

    for (const mod of this.modules.values()) {
      for (const [eventType, handler] of Object.entries(mod.eventHandlers)) {
        eventBus.subscribe(eventType, handler);
      }

      if (mod.init) {
        const ctx: ModuleContext = {
          subscribe: (eventType, handler) =>
            eventBus.subscribe(eventType, handler),
          emit: (type, data) => eventBus.emit(mod.name, type, data),
        };
        mod.init(ctx);
      }
    }

    this.initialized = true;
  }

  getModule(name: string): FeatureModule | undefined {
    return this.modules.get(name);
  }

  getAllModules(): FeatureModule[] {
    return Array.from(this.modules.values());
  }
}

export const moduleRegistry = new ModuleRegistry();
