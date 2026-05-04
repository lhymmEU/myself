"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import type { ErrorData } from "@/lib/claw-ai/parts";

interface ErrorPartProps {
  data: ErrorData;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorPart({ data, onRetry, onDismiss }: ErrorPartProps) {
  const t = useT();
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-red-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-red-600 dark:text-red-400">{data.message}</p>
          {data.detail && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              {data.detail}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {data.retryable && onRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRetry}
                className="h-7 px-2 text-xs"
              >
                <RotateCw className="h-3 w-3 mr-1" />
                {t("claw.parts.error.retry")}
              </Button>
            )}
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-7 px-2 text-xs"
              >
                {t("claw.parts.error.dismiss")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
