"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendToAgent } from "@/lib/modules/agent/client";
import type { AgentEventType } from "@/lib/db/schema/postgres/agent";

interface Props {
  eventType: AgentEventType;
  payload: unknown;
  sourceRef?: { table: string; id: string };
  label?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline" | "default";
  className?: string;
  /** Called after a successful emit (e.g. to close a menu). */
  onSent?: () => void;
}

export function SendToAgentButton({
  eventType,
  payload,
  sourceRef,
  label = "Send to agent",
  size = "sm",
  variant = "outline",
  className,
  onSent,
}: Props) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("sending");
    try {
      await sendToAgent(eventType, payload, sourceRef);
      setState("done");
      toast.success("Sent to agent");
      setTimeout(() => setState("idle"), 1800);
      onSent?.();
    } catch (err) {
      setState("idle");
      toast.error(err instanceof Error ? err.message : "Failed to send to agent");
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={state !== "idle"}
      className={className}
    >
      {state === "sending" ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : state === "done" ? (
        <>
          <Check className="size-3.5 mr-1.5" />
          Sent
        </>
      ) : (
        <>
          <Send className="size-3.5 mr-1.5" />
          {label}
        </>
      )}
    </Button>
  );
}
