"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TodoItem } from "./todo-item";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import type { MindMapTodo } from "@/lib/modules/todos/types";

export function TodoList() {
  const [todos, setTodos] = useState<MindMapTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urgentOnly, setUrgentOnly] = useState(false);

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch("/api/mind-map");
      if (!res.ok) throw new Error("Failed to load mind map");
      const scene = await res.json();

      let elements: unknown[] = [];
      try {
        elements = JSON.parse(scene.elements);
      } catch {
        /* empty scene */
      }

      const parsed = parseMindMapTodos(
        elements as Parameters<typeof parseMindMapTodos>[0]
      );
      setTodos(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load todos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const filtered = urgentOnly ? todos.filter((t) => t.isUrgent) : todos;
  const urgentCount = todos.filter((t) => t.isUrgent).length;

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
          {todos.length} todo{todos.length !== 1 ? "s" : ""} derived from mind
          map
          {urgentCount > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-red-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              {urgentCount} urgent
            </span>
          )}
        </p>

        {urgentCount > 0 && (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="urgent-filter"
              className="text-sm text-muted-foreground"
            >
              Urgent only
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
          {todos.length === 0
            ? "No todos found. Add rectangle items to your mind map to create todos."
            : "No urgent todos."}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((todo) => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </div>
      )}
    </div>
  );
}
