"use client";

import { User, Bot } from "lucide-react";
import type { Message } from "./types";
import { ResponseCard } from "./response-card";
import { ToolApprovalCard } from "./tool-approval-card";

interface MessageBubbleProps {
  message: Message;
  onApproveToolCall?: (messageId: string, toolIndex: number) => void;
  onRejectToolCall?: (messageId: string, toolIndex: number) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({
  message,
  onApproveToolCall,
  onRejectToolCall,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (
    !isUser &&
    message.responseType === "tool_request" &&
    message.toolCalls?.length
  ) {
    return (
      <div className="flex gap-2.5 flex-row">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Bot className="h-3.5 w-3.5" />
        </div>
        <div className="max-w-[80%] space-y-2">
          {message.content && (
            <div className="rounded-2xl rounded-tl-md bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground">
              <p className="whitespace-pre-wrap break-words">
                {message.content}
              </p>
            </div>
          )}
          {message.toolCalls.map((tc, idx) => (
            <ToolApprovalCard
              key={`${message.id}-tc-${idx}`}
              toolCall={tc}
              onApprove={() => onApproveToolCall?.(message.id, idx)}
              onReject={() => onRejectToolCall?.(message.id, idx)}
            />
          ))}
          <p className="text-[10px] text-muted-foreground">
            {formatTime(message.timestamp)}
          </p>
        </div>
      </div>
    );
  }

  if (!isUser && message.responseType && message.responseType !== "text") {
    return <ResponseCard message={message} />;
  }

  return (
    <div
      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? "bg-foreground text-background"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Bot className="h-3.5 w-3.5" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-foreground text-background rounded-tr-md"
            : "bg-muted text-foreground rounded-tl-md"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`mt-1 text-[10px] ${
            isUser ? "text-background/60" : "text-muted-foreground"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
