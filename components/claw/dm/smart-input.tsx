"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { ConversationState } from "./types";

const PLACEHOLDER_KEYS = [
  "claw.dm.input.placeholder1",
  "claw.dm.input.placeholder2",
  "claw.dm.input.placeholder3",
  "claw.dm.input.placeholder4",
] as const;

interface SmartInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  conversationState: ConversationState;
}

export function SmartInput({
  onSend,
  disabled,
  conversationState,
}: SmartInputProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_KEYS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const isBusy =
    conversationState === "sending" || conversationState === "agent-typing";

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t(PLACEHOLDER_KEYS[placeholderIdx] as Parameters<typeof t>[0])}
        disabled={disabled}
        className="min-h-[56px] max-h-[160px] resize-none pr-14 rounded-xl"
        rows={1}
      />
      <Button
        size="sm"
        className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-lg"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
