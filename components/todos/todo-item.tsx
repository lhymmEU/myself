"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import type { MindMapTodo } from "@/lib/modules/todos/types";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: MindMapTodo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const traceWithoutTitle = todo.trace.slice(0, -1);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50",
        todo.isUrgent && "border-red-500/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{todo.title}</span>

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

        {todo.isUrgent && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-0 bg-red-500/15 text-red-700 dark:text-red-400 shrink-0 gap-1"
          >
            <AlertTriangle className="h-3 w-3" />
            urgent
          </Badge>
        )}
      </div>
    </div>
  );
}
