"use client";

import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Shell, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ClawSlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  content: string | null;
  loading: boolean;
  error: string | null;
}

export function ClawSlidePanel({
  open,
  onOpenChange,
  title,
  description,
  content,
  loading,
  error,
}: ClawSlidePanelProps) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [content]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[480px] flex flex-col"
      >
        <SheetHeader className="px-0">
          <SheetTitle className="flex items-center gap-2">
            <Shell className="h-4 w-4" />
            {title}
          </SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="flex-1 min-h-0 mt-4 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">{t("plans.clawPanel.loading")}</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/20 p-3">
              <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {content && !loading && (
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {content}
            </div>
          )}
        </div>

        {content && !loading && (
          <div className="pt-3 border-t mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  {t("plans.clawPanel.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t("plans.clawPanel.copyToClipboard")}
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
