"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/context";
import { useMarkedCollections, useMarkedItems } from "@/lib/swr/hooks";
import { CollectionList } from "./collection-list";
import { ItemList } from "./item-list";
import { AddItemDialog } from "./add-item-dialog";
import { AddCollectionDialog } from "./add-collection-dialog";
import { ShareCardPreview } from "./share-card-preview";
import type { MarkedCollection } from "@/lib/modules/marked/types";

export function MarkedPage() {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareCollection, setShareCollection] =
    useState<MarkedCollection | null>(null);

  const {
    data: collections,
    mutate: mutateCollections,
  } = useMarkedCollections();

  const {
    data: items,
    mutate: mutateItems,
  } = useMarkedItems(selectedId);

  const selected =
    (collections as MarkedCollection[] | undefined)?.find(
      (c) => c.id === selectedId,
    ) ?? null;

  return (
    <div className="flex h-full">
      {/* Left panel -- collection sidebar */}
      <div className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold">
            {t("marked.collections")}
          </h2>
          <AddCollectionDialog onCreated={mutateCollections} />
        </div>
        <CollectionList
          collections={(collections as MarkedCollection[]) ?? []}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMutate={mutateCollections}
          onShare={setShareCollection}
        />
      </div>

      {/* Right panel -- items */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h1 className="text-lg font-semibold">
              {selected
                ? selected.name
                : selectedId === "__uncollected__"
                  ? t("marked.uncollected")
                  : t("marked.allItems")}
            </h1>
            {selected?.notes && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {selected.notes}
              </p>
            )}
          </div>
          <AddItemDialog
            collectionId={
              selectedId === "__uncollected__" ? null : selectedId
            }
            onCreated={() => {
              mutateItems();
              mutateCollections();
            }}
          />
        </div>
        <ItemList
          items={(items as import("@/lib/modules/marked/types").MarkedItem[]) ?? []}
          collections={(collections as MarkedCollection[]) ?? []}
          onMutate={() => {
            mutateItems();
            mutateCollections();
          }}
        />
      </div>

      {/* Share dialog */}
      {shareCollection && (
        <ShareCardPreview
          collection={shareCollection}
          open={!!shareCollection}
          onOpenChange={(open) => {
            if (!open) setShareCollection(null);
          }}
        />
      )}
    </div>
  );
}
