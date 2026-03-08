"use client";

import { TodoList } from "@/components/todos/todo-list";
import { useT } from "@/lib/i18n/context";

export default function TodosPage() {
  const t = useT();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("todos.title")}</h1>
        <p className="text-muted-foreground">{t("todos.subtitle")}</p>
      </div>
      <TodoList />
    </div>
  );
}
