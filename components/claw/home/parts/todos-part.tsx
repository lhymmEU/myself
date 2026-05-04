"use client";

import { Check, Circle } from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TodosData, TodoItem } from "@/lib/claw-ai/parts";

interface TodosPartProps {
  data: TodosData;
  onToggle?: (todo: TodoItem, next: boolean) => void;
}

/** Used both inline (chat thread) and as a standalone home card. */
export function TodosPart({ data, onToggle }: TodosPartProps) {
  const t = useT();
  const items = data.items ?? [];
  const title = data.title ?? t("claw.parts.todos.title");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground py-2">
            {t("claw.parts.todos.empty")}
          </p>
        )}
        {items.map((todo) => (
          <button
            key={todo.id}
            type="button"
            onClick={() => onToggle?.(todo, !todo.done)}
            disabled={!onToggle}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
              onToggle ? "hover:bg-muted/50 cursor-pointer" : "cursor-default",
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                todo.done
                  ? "border-emerald-500 bg-emerald-500 text-background"
                  : "border-muted-foreground/40",
              )}
            >
              {todo.done ? (
                <Check className="h-2.5 w-2.5" />
              ) : (
                <Circle className="h-2.5 w-2.5 opacity-0" />
              )}
            </span>
            <span
              className={cn(
                "flex-1 truncate",
                todo.done && "text-muted-foreground line-through",
              )}
            >
              {todo.text}
            </span>
            {todo.category && (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {todo.category}
              </span>
            )}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
