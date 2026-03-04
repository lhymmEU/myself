"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { Goal } from "@/lib/modules/goals/types";

export function GoalsPreview() {
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    fetch("/api/data?module=goals&action=list")
      .then((r) => r.json())
      .then((data) => setGoals(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  if (goals.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No goals set yet</p>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <div key={goal.id} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="truncate">{goal.title}</span>
            <span className="text-muted-foreground text-xs">
              {goal.progress}%
            </span>
          </div>
          <Progress value={goal.progress} className="h-1.5" />
        </div>
      ))}
    </div>
  );
}
