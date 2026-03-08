"use client";

import { useState } from "react";
import { Plus, Trash2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/types";

interface Plan {
  id: string;
  title: string;
  updatedAt: number;
}

interface PageListProps {
  plans: Plan[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

function relativeTime(timestamp: number, t: (key: TranslationKey) => string): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t("plans.justNow");
  if (minutes < 60) return `${minutes}${t("plans.mAgo")}`;
  if (hours < 24) return `${hours}${t("plans.hAgo")}`;
  if (days < 7) return `${days}${t("plans.dAgo")}`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PageList({
  plans,
  activeId,
  onSelect,
  onDelete,
  onCreate,
}: PageListProps) {
  const t = useT();
  const [search, setSearch] = useState("");

  const filtered = plans.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("plans.pages")}
          </h2>
          <Button
            onClick={onCreate}
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title={t("plans.newPage")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder={t("plans.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 h-8 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground/60 outline-none focus:ring-1 focus:ring-ring transition-shadow"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {search ? t("plans.noMatchingPages") : t("plans.noPagesYet")}
            </p>
          ) : (
            filtered.map((plan) => (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(plan.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(plan.id);
                  }
                }}
                className={`group w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-all cursor-pointer ${
                  plan.id === activeId
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "hover:bg-muted/80"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-[13px]">
                    {plan.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {relativeTime(plan.updatedAt, t)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plan.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
