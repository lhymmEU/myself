"use client";

import { useCallback, useState } from "react";
import { Bookmark, ExternalLink, Plus, X } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { usePlanAttachments } from "@/lib/swr/hooks";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AttachMarkedDialog } from "./attach-marked-dialog";
import type { PlanAttachedItem } from "@/lib/modules/plans/types";
import { toast } from "sonner";

interface Props {
  planId: string;
}

export function AttachmentsPanel({ planId }: Props) {
  const t = useT();
  const { data, mutate } = usePlanAttachments(planId);
  const [pickerOpen, setPickerOpen] = useState(false);

  const items: PlanAttachedItem[] = data?.items ?? [];

  const handleDetach = useCallback(
    async (markedItemId: string) => {
      try {
        const res = await fetch(
          `/api/plans/attachments?planId=${encodeURIComponent(
            planId,
          )}&markedItemId=${encodeURIComponent(markedItemId)}`,
          { method: "DELETE" },
        );
        if (!res.ok) throw new Error();
        await mutate();
      } catch {
        toast.error(t("plans.attachments.failedRemove"));
      }
    },
    [planId, mutate, t],
  );

  return (
    <aside className="w-72 shrink-0 border-l bg-muted/20 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Bookmark className="h-3.5 w-3.5" />
          {t("plans.attachments.title")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setPickerOpen(true)}
          title={t("plans.attachments.attach")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground">
            {t("plans.attachments.empty")}
          </p>
        ) : (
          <ul className="p-2 space-y-1.5">
            {items.map((item) => (
              <AttachedItemCard
                key={item.attachmentId}
                item={item}
                onRemove={() => handleDetach(item.id)}
              />
            ))}
          </ul>
        )}
      </ScrollArea>

      <AttachMarkedDialog
        planId={planId}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onAttached={mutate}
        attachedIds={items.map((i) => i.id)}
      />
    </aside>
  );
}

function AttachedItemCard({
  item,
  onRemove,
}: {
  item: PlanAttachedItem;
  onRemove: () => void;
}) {
  const cleanUrl = (() => {
    try {
      const u = new URL(item.url);
      const host = u.hostname.replace(/^www\./, "");
      const path = u.pathname === "/" ? "" : u.pathname;
      const display = host + path;
      return display.length > 36 ? display.slice(0, 33) + "..." : display;
    } catch {
      return item.url;
    }
  })();

  return (
    <li className="group flex items-start gap-2 rounded-md border bg-card px-2 py-1.5 hover:bg-accent/30 transition-colors">
      {item.favicon ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary external favicon URLs aren't suitable for next/image optimization
        <img
          src={item.favicon}
          alt=""
          className="h-4 w-4 mt-0.5 rounded shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="h-4 w-4 mt-0.5 rounded bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground shrink-0">
          {item.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium hover:underline truncate flex items-center gap-1"
        >
          <span className="truncate">{item.title}</span>
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        </a>
        <p className="text-[10px] text-muted-foreground truncate">{cleanUrl}</p>
      </div>
      <button
        onClick={onRemove}
        className="h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}
