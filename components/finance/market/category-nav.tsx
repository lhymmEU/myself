"use client";

import { useT } from "@/lib/i18n/context";
import { OPENBB_CATEGORIES, type OpenBBCategory } from "@/lib/modules/finance/openbb-modules";

interface CategoryNavProps {
  selected: OpenBBCategory | "all";
  onSelect: (category: OpenBBCategory | "all") => void;
  enabledCategories: Set<OpenBBCategory>;
}

export function CategoryNav({ selected, onSelect, enabledCategories }: CategoryNavProps) {
  const t = useT();

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect("all")}
        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
          selected === "all"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-accent"
        }`}
      >
        {t("finance.market.all")}
      </button>
      {OPENBB_CATEGORIES.filter((c) => enabledCategories.has(c.id)).map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            selected === cat.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {t(cat.labelKey as Parameters<typeof t>[0])}
        </button>
      ))}
    </div>
  );
}
