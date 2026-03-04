"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

interface UpcomingItem {
  id: string;
  title: string;
  date: string;
  type: "todo" | "goal";
}

export function CalendarWidget() {
  const [items, setItems] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    fetch("/api/data?module=calendar&action=upcoming")
      .then((r) => r.json())
      .then((data) => setItems(data.slice(0, 5)))
      .catch(() => {});
  }, []);

  if (items.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <CalendarDays className="h-8 w-8 mx-auto opacity-20" />
        <p>No upcoming deadlines</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between">
          <span className="text-sm truncate">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.date}</span>
        </div>
      ))}
    </div>
  );
}
