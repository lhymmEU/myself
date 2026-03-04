import type { FeatureModule } from "@/lib/core/types";
import { todoTools } from "./tools";

export const todosModule: FeatureModule = {
  name: "todos",
  description: "Todo management with mind map integration and LLM suggestions",
  tools: todoTools,
  eventHandlers: {},
};
