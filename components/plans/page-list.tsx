"use client";

import { useState } from "react";
import { Plus, Trash2, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Plan {
  id: string;
  title: string;
  createdAt: number;
}

interface PageListProps {
  plans: Plan[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
}

export function PageList({
  plans,
  activeId,
  onSelect,
  onDelete,
  onCreate,
}: PageListProps) {
  const [search, setSearch] = useState("");

  const filtered = plans.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <Button onClick={onCreate} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Page
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {search ? "No matching pages" : "No pages yet"}
            </p>
          ) : (
            filtered.map((plan) => (
              <button
                key={plan.id}
                onClick={() => onSelect(plan.id)}
                className={`group w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  plan.id === activeId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(plan.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
