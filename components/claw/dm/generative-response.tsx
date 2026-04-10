"use client";

import { Bot } from "lucide-react";
import {
  Renderer,
  StateProvider,
  ActionProvider,
  VisibilityProvider,
  ValidationProvider,
} from "@json-render/react";
import type { Spec } from "@json-render/core";
import { registry } from "@/lib/claw-ui/registry";
import type { Message } from "./types";

interface GenerativeResponseProps {
  message: Message;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GenerativeResponse({ message }: GenerativeResponseProps) {
  const spec = message.uiSpec as Spec | null;

  if (!spec) return null;

  return (
    <div className="flex gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="max-w-[80%] space-y-2 min-w-0">
        {message.content && (
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}
        <StateProvider initialState={{}}>
          <VisibilityProvider>
            <ActionProvider handlers={{}}>
              <ValidationProvider>
                <Renderer spec={spec} registry={registry} />
              </ValidationProvider>
            </ActionProvider>
          </VisibilityProvider>
        </StateProvider>
        <p className="text-[10px] text-muted-foreground">
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
