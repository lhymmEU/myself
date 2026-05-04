"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationStatus } from "./use-claw-conversation";

interface QuickPromptProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  status?: ConversationStatus;
  /** Friendly text shown above the input. */
  greeting?: string;
  /** Optional preset suggestions; defaults to a small dynamic set. */
  suggestions?: string[];
  autoFocus?: boolean;
}

/**
 * The single, big input that anchors the chat home. Includes 3
 * dynamic suggestions sourced from a stable rotation so the UI never
 * feels static even when openclaw hasn't talked back yet.
 */
export function QuickPrompt({
  onSend,
  disabled,
  status,
  greeting,
  suggestions,
  autoFocus,
}: QuickPromptProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const placeholders = useMemo(
    () =>
      [
        t("claw.home.prompt.placeholder1"),
        t("claw.home.prompt.placeholder2"),
        t("claw.home.prompt.placeholder3"),
        t("claw.home.prompt.placeholder4"),
      ],
    [t],
  );

  const fallbackSuggestions = useMemo(
    () =>
      [
        t("claw.home.suggestions.brief"),
        t("claw.home.suggestions.todos"),
        t("claw.home.suggestions.routine"),
      ],
    [t],
  );

  const effectiveSuggestions = suggestions ?? fallbackSuggestions;

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [placeholders.length]);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const isBusy = status === "submitted" || status === "streaming";

  const handleSend = useCallback(
    (text?: string) => {
      const next = (text ?? value).trim();
      if (!next || disabled) return;
      onSend(next);
      setValue("");
    },
    [value, disabled, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="space-y-3">
      {greeting && (
        <p className="text-sm text-muted-foreground">{greeting}</p>
      )}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholders[placeholderIdx]}
          disabled={disabled}
          className="min-h-[80px] max-h-[200px] resize-none pr-14 rounded-2xl border-2 px-4 py-3 text-base focus-visible:ring-2"
          rows={2}
        />
        <Button
          size="sm"
          className="absolute right-2 bottom-2 h-9 w-9 p-0 rounded-xl"
          onClick={() => handleSend()}
          disabled={disabled || !value.trim()}
        >
          {isBusy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      {effectiveSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {effectiveSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleSend(s)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs",
                "text-muted-foreground transition-colors",
                "hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              <Sparkles className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
