"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, ChevronRight, FileText } from "lucide-react";
import type { MindMapTodo } from "@/lib/modules/todos/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

interface TodoItemProps {
  todo: MindMapTodo;
  onComplete?: (id: string) => void;
  linkedPlanId?: string | null;
}

export function TodoItem({ todo, onComplete, linkedPlanId }: TodoItemProps) {
  const t = useT();
  const [completing, setCompleting] = useState(false);
  const traceWithoutTitle = todo.trace.slice(0, -1);

  const handleComplete = () => {
    if (completing || !onComplete) return;
    setCompleting(true);
    onComplete(todo.id);
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5 transition-all duration-500",
        todo.isUrgent && "border-red-500/30",
        completing ? "opacity-50" : "hover:bg-accent/50"
      )}
    >
      <div className="flex items-center gap-3">
        {onComplete && (
          <button
            onClick={handleComplete}
            disabled={completing}
            title={t("todos.complete")}
            className={cn(
              "h-[18px] w-[18px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
              completing
                ? "border-primary bg-primary"
                : "border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/10"
            )}
          >
            {completing && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-sm font-medium transition-all duration-300",
              completing && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </span>

          {traceWithoutTitle.length > 0 && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              {traceWithoutTitle.map((segment, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" />}
                  <span className="truncate">{segment}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {linkedPlanId && (
          <Link
            href={`/dashboard/plans?id=${encodeURIComponent(linkedPlanId)}`}
            title={t("todos.viewPlan")}
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
          >
            <FileText className="h-3 w-3" />
            {t("todos.viewPlan")}
          </Link>
        )}
        {todo.isUrgent && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-0 bg-red-500/15 text-red-700 dark:text-red-400 shrink-0 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            {t("todos.urgent")}
          </Badge>
        )}
      </div>
    </div>
  );
}
