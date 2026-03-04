export interface PlanPage {
  id: string;
  title: string;
  content: unknown;
  linkedNodeId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePlanInput {
  title: string;
  content?: unknown;
  linkedNodeId?: string | null;
}

export interface UpdatePlanInput {
  id: string;
  title?: string;
  content?: unknown;
  linkedNodeId?: string | null;
}
