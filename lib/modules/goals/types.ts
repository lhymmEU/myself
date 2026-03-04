export interface Milestone {
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  linkedNodeId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateGoalInput {
  title: string;
  targetDate: string;
  milestones?: Milestone[];
  linkedNodeId?: string | null;
}

export interface UpdateGoalInput {
  id: string;
  title?: string;
  targetDate?: string;
  progress?: number;
  milestones?: Milestone[];
  linkedNodeId?: string | null;
}
