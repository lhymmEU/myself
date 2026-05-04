"use client";

import { useMemo, useState } from "react";
import { Search, Folder } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useMarkedCollections, useMarkedItems } from "@/lib/swr/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type {
  MarkedCollection,
  MarkedItem,
} from "@/lib/modules/marked/types";
import { cn } from "@/lib/utils";

interface Props {
  planId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: () => void;
  attachedIds: string[];
}

export function AttachMarkedDialog({
  planId,
  open,
  onOpenChange,
  onAttached,
  attachedIds,
}: Props) {
  const t = useT();
  const { data: collectionsData } = useMarkedCollections();
  const { data: itemsData } = useMarkedItems(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const collections: MarkedCollection[] = useMemo(
    () => (Array.isArray(collectionsData) ? collectionsData : []),
    [collectionsData],
  );
  const items: MarkedItem[] = useMemo(
    () => (Array.isArray(itemsData) ? itemsData : []),
    [itemsData],
  );

  const attachedSet = useMemo(() => new Set(attachedIds), [attachedIds]);

  const grouped = useMemo(() => {
    const collectionById = new Map(collections.map((c) => [c.id, c.name]));
    const groups = new Map<string, { name: string; items: MarkedItem[] }>();
    const lower = query.trim().toLowerCase();

    for (const item of items) {
      if (
        lower &&
        !item.title.toLowerCase().includes(lower) &&
        !item.url.toLowerCase().includes(lower)
      ) {
        continue;
      }
      const key = item.collectionId ?? "__uncollected__";
      const name =
        item.collectionId
          ? (collectionById.get(item.collectionId) ?? t("marked.uncollected"))
          : t("marked.uncollected");
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(item);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, collections, query, t]);

  const handleAttach = async (markedItemId: string) => {
    if (attachedSet.has(markedItemId)) return;
    setBusyId(markedItemId);
    try {
      const res = await fetch("/api/plans/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, markedItemId }),
      });
      if (!res.ok) throw new Error();
      onAttached();
    } catch {
      toast.error(t("plans.attachments.failedAttach"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("plans.attachments.pickerTitle")}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t("plans.attachments.pickerDesc")}
          </p>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("plans.attachments.searchPlaceholder")}
            className="pl-8"
          />
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {items.length === 0
                ? t("marked.noItems")
                : t("plans.attachments.noMatch")}
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {grouped.map((group) => (
                <div key={group.name}>
                  <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-muted-foreground">
                    <Folder className="h-3 w-3" />
                    {group.name}
                  </div>
                  <ul className="space-y-1">
                    {group.items.map((item) => {
                      const isAttached = attachedSet.has(item.id);
                      return (
                        <li
                          key={item.id}
                          className={cn(
                            "rounded-md border bg-card px-2 py-1.5 flex items-center gap-2",
                            isAttached && "opacity-60",
                          )}
                        >
                          {item.favicon ? (
                            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external favicon URLs aren't suitable for next/image optimization
                            <img
                              src={item.favicon}
                              alt=""
                              className="h-4 w-4 rounded shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                          ) : (
                            <div className="h-4 w-4 rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0">
                              {item.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {item.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {item.url}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={isAttached ? "outline" : "default"}
                            disabled={isAttached || busyId === item.id}
                            onClick={() => handleAttach(item.id)}
                            className="h-6 px-2 text-xs shrink-0"
                          >
                            {isAttached
                              ? t("plans.attachments.attached")
                              : t("plans.attachments.attachAction")}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
