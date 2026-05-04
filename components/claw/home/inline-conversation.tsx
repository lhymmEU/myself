"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Loader2, X, Plus } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  MessagePartRenderer,
  type MessagePartHandlers,
} from "./parts/message-part-renderer";
import { ErrorPart } from "./parts/error-part";
import type { ClawUIMessage } from "@/lib/claw-ai/parts";
import type { ConversationStatus } from "./use-claw-conversation";

interface InlineConversationProps {
  messages: ClawUIMessage[];
  status: ConversationStatus;
  error: Error | null;
  onApproveTool: (messageId: string, partId: string) => void;
  onRejectTool: (messageId: string, partId: string) => void;
  onClose: () => void;
  onNewChat: () => void;
  onDismissError: () => void;
}

/**
 * The inline conversation that opens beneath the hero on send. The
 * cards remain visible above (the parent owns layout); this view only
 * concerns itself with rendering the message thread plus an empty/
 * loading placeholder.
 */
export function InlineConversation({
  messages,
  status,
  error,
  onApproveTool,
  onRejectTool,
  onClose,
  onNewChat,
  onDismissError,
}: InlineConversationProps) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handlers = (messageId: string): MessagePartHandlers => ({
    onApproveTool: (partId) => onApproveTool(messageId, partId),
    onRejectTool: (partId) => onRejectTool(messageId, partId),
  });

  return (
    <div className="flex flex-col rounded-2xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h3 className="text-sm font-medium">
          {t("claw.home.conversation.title")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onNewChat}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("claw.home.conversation.newChat")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0"
            title={t("claw.home.conversation.close")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-[60vh] [&_[data-slot=scroll-area-viewport]>div]:!block">
        <div ref={scrollRef} className="p-4 space-y-4">
          {messages.length === 0 && status !== "submitted" && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("claw.home.conversation.empty")}
            </p>
          )}

          {messages.map((message) => (
            <MessageRow
              key={message.id}
              message={message}
              handlers={handlers(message.id)}
            />
          ))}

          {(status === "submitted" || status === "streaming") &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="rounded-2xl bg-muted px-4 py-2.5 inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {t("claw.home.conversation.thinking")}
                  </span>
                </div>
              </div>
            )}

          {error && (
            <ErrorPart
              data={{ message: error.message, retryable: true }}
              onDismiss={onDismissError}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MessageRowProps {
  message: ClawUIMessage;
  handlers: MessagePartHandlers;
}

function MessageRow({ message, handlers }: MessageRowProps) {
  const isUser = message.role === "user";
  const Icon = isUser ? User : Bot;

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            !isUser && "text-muted-foreground",
          )}
        />
      </div>
      <div
        className={cn(
          "max-w-[85%] min-w-0 space-y-2",
          isUser && "items-end",
        )}
      >
        {message.parts.map((part, i) => {
          if (isUser && part.type === "text") {
            return (
              <div
                key={i}
                className="rounded-2xl rounded-tr-md bg-primary text-primary-foreground px-4 py-2 text-sm whitespace-pre-wrap break-words"
              >
                {part.text}
              </div>
            );
          }
          return (
            <MessagePartRenderer
              key={i}
              part={part}
              handlers={handlers}
            />
          );
        })}
      </div>
    </div>
  );
}
