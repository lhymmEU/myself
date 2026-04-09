"use client";

import { useT } from "@/lib/i18n/context";
import { Bookmark } from "lucide-react";
import { ItemCard } from "./item-card";
import type { MarkedItem, MarkedCollection } from "@/lib/modules/marked/types";

interface Props {
  items: MarkedItem[];
  collections: MarkedCollection[];
  onMutate: () => void;
}

export function ItemList({ items, collections, onMutate }: Props) {
  const t = useT();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
        <Bookmark className="h-10 w-10" />
        <p className="text-sm">{t("marked.noItems")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          collections={collections}
          onMutate={onMutate}
        />
      ))}
    </div>
  );
}
