"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import type { Todo } from "@/lib/modules/todos/types";

export function TodoPreview() {
  const [todos, setTodos] = useState<Todo[]>([]);

  useEffect(() => {
    fetch("/api/data?module=todos&action=getActive")
      .then((r) => r.json())
      .then((data) => setTodos(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active todos yet</p>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <div key={todo.id} className="flex items-center gap-2">
          {todo.completed ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm truncate flex-1">{todo.title}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {todo.priority}
          </Badge>
        </div>
      ))}
    </div>
  );
}
