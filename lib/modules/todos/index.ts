import type { FeatureModule } from "@/lib/core/types";

export const todosModule: FeatureModule = {
  name: "todos",
  description: "Todos derived from mind map rectangle nodes",
  eventHandlers: {},
  availableIn: ["local", "cloud"],
};
