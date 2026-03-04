import { TodoList } from "@/components/todos/todo-list";

export default function TodosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Todos</h1>
        <p className="text-muted-foreground">Manage tasks manually or let AI help</p>
      </div>
      <TodoList />
    </div>
  );
}
