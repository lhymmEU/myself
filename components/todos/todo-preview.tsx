"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Check, ChevronRight } from "lucide-react";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import { completeTodo } from "@/lib/modules/todos/complete-todo";
import type { MindMapTodo } from "@/lib/modules/todos/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";

export function TodoPreview() {
  const t = useT();
  const [todos, setTodos] = useState<MindMapTodo[]>([]);

  useEffect(() => {
    fetch("/api/mind-map")
      .then((r) => r.json())
      .then((scene) => {
        let elements: unknown[] = [];
        try {
          elements = JSON.parse(scene.elements);
        } catch {
          /* empty */
        }
        const parsed = parseMindMapTodos(
          elements as Parameters<typeof parseMindMapTodos>[0]
        );
        setTodos(parsed.filter((td) => td.isUrgent));
      })
      .catch(() => {});
  }, []);

  const handleComplete = useCallback(async (todoId: string) => {
    const success = await completeTodo(todoId);
    if (success) {
      setTimeout(() => {
        setTodos((prev) => prev.filter((td) => td.id !== todoId));
      }, 1000);
    }
  }, []);

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("todos.noUrgentTodosPreview")}
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
      {todos.map((todo) => {
        return <PreviewItem key={todo.id} todo={todo} onComplete={handleComplete} t={t} />;
      })}
    </div>
  );
}

function PreviewItem({
  todo,
  onComplete,
  t,
}: {
  todo: MindMapTodo;
  onComplete: (id: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const [completing, setCompleting] = useState(false);
  const traceWithoutTitle = todo.trace.slice(0, -1);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    onComplete(todo.id);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 transition-all duration-500",
        completing && "opacity-50"
      )}
    >
      <button
        onClick={handleClick}
        disabled={completing}
        title={t("todos.complete")}
        className={cn(
          "h-[14px] w-[14px] rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
          completing
            ? "border-primary bg-primary"
            : "border-muted-foreground/30 hover:border-primary/60 hover:bg-primary/10"
        )}
      >
        {completing && (
          <Check className="h-2.5 w-2.5 text-primary-foreground" />
        )}
      </button>
      {todo.isUrgent ? (
        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
      ) : (
        <div className="h-3.5 w-3.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            "text-sm truncate block transition-all duration-300",
            completing && "line-through text-muted-foreground"
          )}
        >
          {todo.title}
        </span>
        {traceWithoutTitle.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            {traceWithoutTitle.map((segment, i) => (
              <span key={i} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="h-2.5 w-2.5" />}
                <span className="truncate">{segment}</span>
              </span>
            ))}
          </span>
        )}
      </div>
      {todo.isUrgent && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
          {t("todos.urgent")}
        </Badge>
      )}
    </div>
  );
}
