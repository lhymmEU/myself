export interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  completions: string[];
  linkedNodeId?: string | null;
  createdAt: number;
}

export interface CreateHabitInput {
  name: string;
  frequency?: "daily" | "weekly";
  linkedNodeId?: string | null;
}
