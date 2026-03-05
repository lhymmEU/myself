import type { FeatureModule } from "@/lib/core/types";
import { todoTools } from "./tools";

export const todosModule: FeatureModule = {
  name: "todos",
  description: "Todos derived from mind map rectangle nodes",
  tools: todoTools,
  eventHandlers: {},
};
