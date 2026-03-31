"use client";

import { useMemo, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TodoItem } from "./todo-item";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import { completeTodo } from "@/lib/modules/todos/complete-todo";
import type { MindMapTodo } from "@/lib/modules/todos/types";
import { useT } from "@/lib/i18n/context";
import { useTodoSource } from "@/lib/swr/hooks";

export function TodoList() {
  const t = useT();
  const { data: scene, isLoading: loading, error: fetchError } = useTodoSource();
  const [urgentOnly, setUrgentOnly] = useState(false);

  const todos: MindMapTodo[] = useMemo(() => {
    if (!scene || fetchError) return [];
    let elements: unknown[] = [];
    try {
      elements = JSON.parse(scene.elements);
    } catch {
      return [];
    }
    return parseMindMapTodos(elements as Parameters<typeof parseMindMapTodos>[0]);
  }, [scene, fetchError]);

  const error = fetchError ? (fetchError instanceof Error ? fetchError.message : t("todos.failedLoadTodos")) : null;
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const handleComplete = useCallback(async (todoId: string) => {
    const success = await completeTodo(todoId);
    if (success) {
      setTimeout(() => {
        setCompletedIds((prev) => new Set(prev).add(todoId));
      }, 1000);
    }
  }, []);

  const visibleTodos = todos.filter((td) => !completedIds.has(td.id));
  const filtered = urgentOnly ? visibleTodos.filter((td) => td.isUrgent) : visibleTodos;
  const urgentCount = visibleTodos.filter((td) => td.isUrgent).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {visibleTodos.length} {t("todos.derivedFromMindMap")}
          {urgentCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {urgentCount} {t("todos.urgent")}
            </span>
          )}
        </p>

        {urgentCount > 0 && (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="urgent-filter"
              className="text-sm text-muted-foreground"
            >
              {t("todos.urgentOnly")}
            </Label>
            <Switch
              id="urgent-filter"
              checked={urgentOnly}
              onCheckedChange={setUrgentOnly}
            />
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {visibleTodos.length === 0
            ? t("todos.noTodos")
            : t("todos.noUrgentTodos")}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onComplete={handleComplete} />
          ))}
        </div>
      )}
    </div>
  );
}
