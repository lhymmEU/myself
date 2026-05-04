"use client";

import { useState } from "react";
import { Check, X, Loader2, ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApprovalData } from "@/lib/claw-ai/parts";

interface ApprovalPartProps {
  data: ApprovalData;
  onApprove?: () => void;
  onReject?: () => void;
}

/**
 * Plain-language approval card. Shows the agent's one-sentence
 * summary; raw `args` JSON is hidden behind a "Show details"
 * disclosure so the user isn't faced with a wall of JSON.
 */
export function ApprovalPart({ data, onApprove, onReject }: ApprovalPartProps) {
  const t = useT();
  const [showDetails, setShowDetails] = useState(false);

  const status = data.status ?? "pending";
  const isPending = status === "pending";
  const isExecuting = status === "executing";
  const isDone = status === "succeeded";
  const isFailed = status === "failed";
  const isRejected = status === "rejected";

  return (
    <div
      className={cn(
        "rounded-xl border p-3 space-y-2 text-sm",
        isPending && "bg-muted/50",
        isExecuting && "bg-amber-500/5 border-amber-500/30",
        isDone && "bg-emerald-500/5 border-emerald-500/30",
        isFailed && "bg-red-500/5 border-red-500/30",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            isExecuting ? "bg-amber-500/15 text-amber-500" : "bg-foreground/10",
          )}
        >
          {isExecuting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isDone ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : isFailed || isRejected ? (
            <X className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <Check className="h-3.5 w-3.5 opacity-60" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium">{data.summary}</p>
          {isExecuting && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("claw.parts.approval.executing")}
            </p>
          )}
          {isDone && data.result && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {data.result}
            </p>
          )}
          {isFailed && data.result && (
            <p className="text-xs text-red-500 mt-0.5 truncate">
              {data.result}
            </p>
          )}
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onApprove}
            className="h-7 px-3 text-xs"
          >
            <Check className="h-3 w-3 mr-1" />
            {t("claw.parts.approval.approve")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            className="h-7 px-3 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            {t("claw.parts.approval.reject")}
          </Button>
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                showDetails && "rotate-180",
              )}
            />
            {showDetails
              ? t("claw.parts.approval.hideDetails")
              : t("claw.parts.approval.showDetails")}
          </button>
        </div>
      )}

      {showDetails && (
        <div className="rounded-md bg-background/50 p-2 font-mono text-[11px]">
          <p className="text-muted-foreground mb-1">{data.tool}</p>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(data.args, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
