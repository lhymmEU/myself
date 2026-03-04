"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Circle,
  CheckCircle2,
  Trash2,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Todo } from "@/lib/modules/todos/types";
import { cn } from "@/lib/utils";

const PRIORITY_COLORS: Record<Todo["priority"], string> = {
  urgent: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = todo.description || todo.llmReasoning;

  return (
    <div className="group rounded-lg border bg-card px-3 py-2.5 transition-colors hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <button
          onClick={() => onToggle(todo.id)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          {todo.completed ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <button
          onClick={() => hasDetails && setExpanded(!expanded)}
          className={cn(
            "flex-1 text-left text-sm min-w-0",
            hasDetails && "cursor-pointer"
          )}
        >
          <span
            className={cn(
              todo.completed && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </span>
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {todo.dueDate && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {todo.dueDate}
            </span>
          )}

          {todo.source === "auto" && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 gap-0.5"
            >
              <Sparkles className="h-2.5 w-2.5" />
              AI
            </Badge>
          )}

          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 border-0",
              PRIORITY_COLORS[todo.priority]
            )}
          >
            {todo.priority}
          </Badge>

          {hasDetails && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(todo.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && hasDetails && (
        <div className="mt-2 ml-8 space-y-1.5 text-sm text-muted-foreground">
          {todo.description && <p>{todo.description}</p>}
          {todo.llmReasoning && (
            <p className="italic text-xs border-l-2 border-muted pl-2">
              {todo.llmReasoning}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
