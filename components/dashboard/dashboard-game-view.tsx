"use client";

import { WishlistSection } from "./wishlist-section";
import { UserPanel } from "./user-panel";
import { TodoPreview } from "@/components/todos/todo-preview";

export function DashboardGameView() {
  return (
    <div className="flex flex-col h-full p-8 gap-6">
      <WishlistSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <UserPanel />
        <div className="rounded-lg border p-4">
          <TodoPreview />
        </div>
      </div>
    </div>
  );
}
