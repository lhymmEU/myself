"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import type { MindMapTodo } from "@/lib/modules/todos/types";

export function TodoPreview() {
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
        setTodos(parsed.filter((t) => t.isUrgent).slice(0, 5));
      })
      .catch(() => {});
  }, []);

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No urgent todos
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => {
        const traceWithoutTitle = todo.trace.slice(0, -1);
        return (
          <div key={todo.id} className="flex items-center gap-2">
            {todo.isUrgent ? (
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
            ) : (
              <div className="h-3.5 w-3.5 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <span className="text-sm truncate block">{todo.title}</span>
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
                urgent
              </Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}
