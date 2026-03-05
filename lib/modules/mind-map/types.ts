export interface LifeNode {
  id: string;
  label: string;
  type: "category" | "item";
  parentId: string | null;
  color: string;
  positionX: number;
  positionY: number;
  connections: string[];
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface CreateNodeInput {
  label: string;
  type: "category" | "item";
  parentId?: string | null;
  color?: string;
  positionX?: number;
  positionY?: number;
}

export interface UpdateNodeInput {
  id: string;
  label?: string;
  type?: "category" | "item";
  color?: string;
  positionX?: number;
  positionY?: number;
  connections?: string[];
  metadata?: Record<string, unknown>;
}

export interface MindMapScene {
  id: string;
  name: string;
  elements: string;
  appState: string;
  files: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateSceneInput {
  name?: string;
  elements?: string;
  appState?: string;
  files?: string;
}

export interface UpdateSceneInput {
  id: string;
  name?: string;
  elements?: string;
  appState?: string;
  files?: string;
}
