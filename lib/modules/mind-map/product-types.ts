export type SceneMode = "mind" | "product";

// --- User Profiles ---

export interface PmUserProfile {
  id: string;
  name: string;
  type: string;
  typeColor: string;
  contact: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserProfileInput {
  name: string;
  type?: string;
  typeColor?: string;
  contact?: string;
  notes?: string;
}

export interface UpdateUserProfileInput {
  id: string;
  name?: string;
  type?: string;
  typeColor?: string;
  contact?: string;
  notes?: string;
}

// --- Features ---

export type FeatureStatus = "planned" | "in-progress" | "done";
export type FeaturePriority = "low" | "medium" | "high" | "critical";

export interface PmFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  notes: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFeatureInput {
  name: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  notes?: string;
}

export interface UpdateFeatureInput {
  id: string;
  name?: string;
  description?: string;
  status?: FeatureStatus;
  priority?: FeaturePriority;
  notes?: string;
}

// --- Demands & Assumptions ---

export type DemandType = "demand" | "assumption";
export type DemandStatus =
  | "unvalidated"
  | "validating"
  | "validated"
  | "invalidated";

export interface PmDemand {
  id: string;
  title: string;
  description: string;
  type: DemandType;
  status: DemandStatus;
  evidence: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateDemandInput {
  title: string;
  description?: string;
  type?: DemandType;
  status?: DemandStatus;
  evidence?: string;
}

export interface UpdateDemandInput {
  id: string;
  title?: string;
  description?: string;
  type?: DemandType;
  status?: DemandStatus;
  evidence?: string;
}

// --- Stakeholders ---

export interface StakeholderDetail {
  objectives: string;
  desires: string;
  requirements: string;
  expectations: string;
}

export interface PmStakeholder {
  id: string;
  name: string;
  role: string;
  roleColor: string;
  details: StakeholderDetail;
  clawNotes: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStakeholderInput {
  name: string;
  role?: string;
  roleColor?: string;
  details?: Partial<StakeholderDetail>;
  clawNotes?: string;
}

export interface UpdateStakeholderInput {
  id: string;
  name?: string;
  role?: string;
  roleColor?: string;
  details?: Partial<StakeholderDetail>;
  clawNotes?: string;
}
