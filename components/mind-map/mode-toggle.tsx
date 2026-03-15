"use client";

import { Brain, Package } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { SceneMode } from "@/lib/modules/mind-map/types";

interface ModeToggleProps {
  mode: SceneMode;
  onChange: (mode: SceneMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  const t = useT();

  return (
    <div className="inline-flex items-center rounded-lg border bg-muted p-0.5 gap-0.5">
      <button
        onClick={() => onChange("mind")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "mind"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Brain className="w-4 h-4" />
        {t("mindMap.modeMind")}
      </button>
      <button
        onClick={() => onChange("product")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "product"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Package className="w-4 h-4" />
        {t("mindMap.modeProduct")}
      </button>
    </div>
  );
}
