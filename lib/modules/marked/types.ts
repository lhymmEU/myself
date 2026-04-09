export interface MarkedCollection {
  id: string;
  name: string;
  notes?: string | null;
  slug?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface MarkedItem {
  id: string;
  url: string;
  title: string;
  sourceTag?: string | null;
  notes?: string | null;
  favicon?: string | null;
  ogImage?: string | null;
  ogDescription?: string | null;
  collectionId?: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateCollectionInput {
  name: string;
  notes?: string | null;
}

export interface UpdateCollectionInput {
  id: string;
  name?: string;
  notes?: string | null;
}

export interface CreateItemInput {
  url: string;
  title: string;
  sourceTag?: string | null;
  notes?: string | null;
  favicon?: string | null;
  ogImage?: string | null;
  ogDescription?: string | null;
  collectionId?: string | null;
}

export interface UpdateItemInput {
  id: string;
  url?: string;
  title?: string;
  sourceTag?: string | null;
  notes?: string | null;
  favicon?: string | null;
  ogImage?: string | null;
  ogDescription?: string | null;
  collectionId?: string | null;
}

export interface UrlMeta {
  title: string;
  description: string;
  image: string;
  favicon: string;
  sourceTag: string;
}

export interface MarkedPayload {
  v: number;
  c: string;
  items: { t: string; u: string }[];
}
