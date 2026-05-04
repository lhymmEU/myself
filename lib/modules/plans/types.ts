import type { MarkedItem } from "@/lib/modules/marked/types";

export interface PlanPage {
  id: string;
  title: string;
  content: unknown;
  linkedNodeId?: string | null;
  folderId?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlanFolder {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePlanInput {
  title: string;
  content?: unknown;
  linkedNodeId?: string | null;
  folderId?: string | null;
}

export interface UpdatePlanInput {
  id: string;
  title?: string;
  content?: unknown;
  linkedNodeId?: string | null;
  folderId?: string | null;
}

export interface PlanAttachedItem extends MarkedItem {
  attachmentId: string;
  attachmentSortOrder: number;
  attachedAt: number;
}
