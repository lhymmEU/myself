"use client";

import { Languages, Search } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface SelectionActionsProps {
  charCount: number;
  selectedText: string;
  clawConnected: boolean;
  onTranslate: (text: string) => void;
  onExplain: (text: string) => void;
}

export function SelectionActions({
  charCount,
  selectedText,
  clawConnected,
  onTranslate,
  onExplain,
}: SelectionActionsProps) {
  const t = useT();

  if (charCount <= 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full bg-muted/90 border border-border/60 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="pl-3 pr-1 py-1.5 text-xs text-muted-foreground tabular-nums">
        {charCount} {t("plans.charsSelected")}
      </span>

      {clawConnected && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <button
            type="button"
            onClick={() => onTranslate(selectedText)}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t("plans.translateTooltip")}
          >
            <Languages className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onExplain(selectedText)}
            className="p-1.5 mr-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={t("plans.explainTooltip")}
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
