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
import { Textarea } from "@/components/ui/textarea";
import {
  Shell,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ClawSlidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  content: string | null;
  loading: boolean;
  error: string | null;
  /** When set, renders the selected text + question input above the response */
  selectedText?: string;
  question?: string;
  onQuestionChange?: (value: string) => void;
  onSend?: () => void;
}

export function ClawSlidePanel({
  open,
  onOpenChange,
  title,
  description,
  content,
  loading,
  error,
  selectedText,
  question,
  onQuestionChange,
  onSend,
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

  const interactive = !!selectedText;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[400px] sm:max-w-[480px] flex flex-col px-6 py-6 gap-0"
      >
        <SheetHeader className="p-0 pb-4 border-b border-border/40">
          <SheetTitle className="flex items-center gap-2">
            <Shell className="h-4 w-4" />
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="mt-1">{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 py-5 overflow-y-auto space-y-4">
          {interactive && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("plans.clawPanel.selectedContext")}
                </p>
                <div className="rounded-lg border border-border/60 bg-muted/40 px-3.5 py-3 text-sm text-foreground/80 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {selectedText}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("plans.clawPanel.yourQuestion")}
                </p>
                <Textarea
                  className="text-sm resize-none"
                  rows={3}
                  placeholder={t("plans.clawPanel.questionPlaceholder")}
                  value={question ?? ""}
                  onChange={(e) => onQuestionChange?.(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      onSend?.();
                    }
                  }}
                />
              </div>

              <Button
                size="sm"
                className="w-full gap-2"
                onClick={onSend}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" />
                )}
                {t("plans.clawPanel.explain")}
              </Button>

              {(content || error) && (
                <div className="border-t border-border/40 pt-1" />
              )}
            </div>
          )}

          {loading && !interactive && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">{t("plans.clawPanel.loading")}</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-950/20 px-3.5 py-3">
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
          <div className="pt-4 border-t border-border/40">
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
