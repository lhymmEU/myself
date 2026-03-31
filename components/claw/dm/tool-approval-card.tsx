"use client";

import { useState } from "react";
import { Check, X, Loader2, Wrench, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/lib/i18n/context";
import type { PendingToolCall } from "./types";

interface ToolApprovalCardProps {
  toolCall: PendingToolCall;
  onApprove: () => void;
  onReject: () => void;
}

export function ToolApprovalCard({
  toolCall,
  onApprove,
  onReject,
}: ToolApprovalCardProps) {
  const t = useT();
  const [showParams, setShowParams] = useState(false);

  const isPending = toolCall.status === "pending";
  const isExecuting = toolCall.status === "executing";

  const statusBadge = () => {
    switch (toolCall.status) {
      case "approved":
      case "succeeded":
        return (
          <Badge variant="default" className="bg-emerald-600 text-[10px]">
            <Check className="h-2.5 w-2.5 mr-0.5" />
            {toolCall.status === "succeeded"
              ? t("claw.dm.toolApproval.succeeded")
              : t("claw.dm.toolApproval.approved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="secondary" className="text-[10px]">
            <X className="h-2.5 w-2.5 mr-0.5" />
            {t("claw.dm.toolApproval.rejected")}
          </Badge>
        );
      case "executing":
        return (
          <Badge variant="default" className="text-[10px]">
            <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
            {t("claw.dm.toolApproval.executing")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="text-[10px]">
            <X className="h-2.5 w-2.5 mr-0.5" />
            {t("claw.dm.toolApproval.failed")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const hasArgs = Object.keys(toolCall.arguments).length > 0;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{toolCall.name}</p>
            <p className="text-[10px] text-muted-foreground">
              {t("claw.dm.toolApproval.description")}
            </p>
          </div>
        </div>
        {statusBadge()}
      </div>

      {hasArgs && (
        <button
          type="button"
          onClick={() => setShowParams(!showParams)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showParams ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          {t("claw.dm.toolApproval.parameters")}
        </button>
      )}

      {showParams && hasArgs && (
        <pre className="text-[10px] bg-muted rounded-md p-2 overflow-x-auto max-h-32">
          {JSON.stringify(toolCall.arguments, null, 2)}
        </pre>
      )}

      {toolCall.error && (
        <p className="text-[10px] text-red-400">{toolCall.error}</p>
      )}

      {isPending && (
        <div className="flex gap-1.5 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={onReject}
            className="h-6 text-[10px] px-2"
          >
            <X className="h-3 w-3 mr-0.5" />
            {t("claw.dm.toolApproval.reject")}
          </Button>
          <Button
            size="sm"
            onClick={onApprove}
            className="h-6 text-[10px] px-2"
          >
            <Check className="h-3 w-3 mr-0.5" />
            {t("claw.dm.toolApproval.approve")}
          </Button>
        </div>
      )}
    </div>
  );
}
