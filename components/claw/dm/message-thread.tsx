"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import type { ConversationState, Message } from "./types";
import { MessageBubble } from "./message-bubble";

interface MessageThreadProps {
  messages: Message[];
  conversationState: ConversationState;
  error: string | null;
  onDismissError: () => void;
}

export function MessageThread({
  messages,
  conversationState,
  error,
  onDismissError,
}: MessageThreadProps) {
  const t = useT();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationState]);

  if (messages.length === 0 && conversationState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">{t("claw.dm.thread.empty")}</p>
        <p className="text-xs mt-1">{t("claw.dm.thread.emptyHint")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full rounded-lg border border-border p-4">
      <div className="space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {conversationState === "agent-typing" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t("claw.dm.thread.typing")}</span>
          </div>
        )}

        {conversationState === "error" && error && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-foreground">{error}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 h-7 px-2 text-xs"
                onClick={onDismissError}
              >
                {t("common.close")}
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
