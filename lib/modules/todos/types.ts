export type TodoPriority = "low" | "medium" | "high" | "urgent";
export type TodoSource = "manual" | "auto";

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TodoPriority;
  dueDate?: string;
  source: TodoSource;
  linkedNodeId?: string;
  llmReasoning?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: TodoPriority;
  dueDate?: string;
  linkedNodeId?: string;
}

export interface UpdateTodoInput {
  id: string;
  title?: string;
  description?: string;
  completed?: boolean;
  priority?: TodoPriority;
  dueDate?: string;
  linkedNodeId?: string;
}

export interface TodoSuggestion {
  title: string;
  description?: string;
  priority: TodoPriority;
  reasoning: string;
  linkedNodeId?: string;
}
