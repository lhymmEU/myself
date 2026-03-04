"use client";

import type { Milestone } from "@/lib/modules/goals/types";
import { CheckCircle2, Circle } from "lucide-react";

interface MilestoneListProps {
  milestones: Milestone[];
  onComplete: (index: number) => void;
}

export function MilestoneList({ milestones, onComplete }: MilestoneListProps) {
  if (milestones.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No milestones</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {milestones.map((milestone, index) => (
        <li key={index} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !milestone.completed && onComplete(index)}
            disabled={milestone.completed}
            className="shrink-0 disabled:cursor-default"
          >
            {milestone.completed ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <span
            className={`text-sm ${
              milestone.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {milestone.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
