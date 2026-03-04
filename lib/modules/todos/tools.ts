import { z } from "zod";
import type { AgentTool } from "@/lib/core/types";
import {
  createTodo,
  updateTodo,
  deleteTodo,
  getTodo,
  getAllTodos,
  getActiveTodos,
} from "./actions";

export const todoTools: AgentTool[] = [
  {
    name: "createTodo",
    description: "Create a new todo item",
    parameters: z.object({
      title: z.string(),
      description: z.string().optional(),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      dueDate: z.string().optional(),
      linkedNodeId: z.string().optional(),
    }),
    handler: async (params) => {
      const input = params as {
        title: string;
        description?: string;
        priority?: "low" | "medium" | "high" | "urgent";
        dueDate?: string;
        linkedNodeId?: string;
      };
      return createTodo(input);
    },
  },
  {
    name: "completeTodo",
    description: "Mark a todo as completed",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      return updateTodo({ id, completed: true });
    },
  },
  {
    name: "queryTodos",
    description: "Query todos - get all, active only, or a specific todo by ID",
    parameters: z.object({
      filter: z.enum(["all", "active"]).optional(),
      id: z.string().optional(),
    }),
    handler: async (params) => {
      const { filter = "all", id } = params as {
        filter?: "all" | "active";
        id?: string;
      };
      if (id) {
        const todo = getTodo(id);
        return todo ?? { error: "Todo not found" };
      }
      if (filter === "active") {
        return getActiveTodos();
      }
      return getAllTodos();
    },
  },
  {
    name: "deleteTodo",
    description: "Delete a todo by ID",
    parameters: z.object({ id: z.string() }),
    handler: async (params) => {
      const { id } = params as { id: string };
      deleteTodo(id);
      return { success: true, id };
    },
  },
];
