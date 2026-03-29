"use client";

import { useT } from "@/lib/i18n/context";

export interface Category {
  id: string;
  labelKey: string;
}

export const CATEGORIES: Category[] = [
  { id: "tasks", labelKey: "claw.dm.shelf.categories.tasks" },
  { id: "memory", labelKey: "claw.dm.shelf.categories.memory" },
  { id: "health", labelKey: "claw.dm.shelf.categories.health" },
  { id: "skills", labelKey: "claw.dm.shelf.categories.skills" },
];

interface CategoryChipsProps {
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
  disabled: boolean;
}

export function CategoryChips({
  activeCategory,
  onSelect,
  disabled,
}: CategoryChipsProps) {
  const t = useT();

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(isActive ? null : cat.id)}
            className={`shrink-0 rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {t(cat.labelKey as Parameters<typeof t>[0])}
          </button>
        );
      })}
    </div>
  );
}
