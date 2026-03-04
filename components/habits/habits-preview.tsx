"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

interface HabitStreak {
  id: string;
  name: string;
  streak: number;
}

export function HabitsPreview() {
  const [habits, setHabits] = useState<HabitStreak[]>([]);

  useEffect(() => {
    fetch("/api/data?module=habits&action=streaks")
      .then((r) => r.json())
      .then((data) => setHabits(data.slice(0, 4)))
      .catch(() => {});
  }, []);

  if (habits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No habits tracked yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {habits.map((h) => (
        <div key={h.id} className="flex items-center justify-between">
          <span className="text-sm truncate">{h.name}</span>
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-3 w-3" />
            <span className="text-xs font-medium">{h.streak}d</span>
          </div>
        </div>
      ))}
    </div>
  );
}
