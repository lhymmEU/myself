"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Trash2, Calendar } from "lucide-react";
import { MilestoneList } from "./milestone-list";
import type { Goal } from "@/lib/modules/goals/types";

interface GoalCardProps {
  goal: Goal;
  onUpdate: (id: string, data: { progress?: number }) => void;
  onDelete: (id: string) => void;
  onCompleteMilestone: (goalId: string, milestoneIndex: number) => void;
}

function daysRemaining(targetDate: string): number {
  const target = new Date(targetDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function ProgressRing({ progress }: { progress: number }) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
        {progress}%
      </span>
    </div>
  );
}

export function GoalCard({ goal, onUpdate, onDelete, onCompleteMilestone }: GoalCardProps) {
  const remaining = daysRemaining(goal.targetDate);

  return (
    <Card className="group relative">
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
        onClick={() => onDelete(goal.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <ProgressRing progress={goal.progress} />
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{goal.title}</CardTitle>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{goal.targetDate}</span>
              <span className="mx-1">·</span>
              <span className={remaining < 0 ? "text-destructive" : remaining <= 7 ? "text-orange-500" : ""}>
                {remaining < 0
                  ? `${Math.abs(remaining)}d overdue`
                  : remaining === 0
                    ? "Due today"
                    : `${remaining}d left`}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{goal.progress}%</span>
          </div>
          <Slider
            value={[goal.progress]}
            max={100}
            step={5}
            onValueCommit={(value) => onUpdate(goal.id, { progress: value[0] })}
          />
        </div>

        {goal.milestones.length > 0 && (
          <>
            <Separator />
            <MilestoneList
              milestones={goal.milestones}
              onComplete={(index) => onCompleteMilestone(goal.id, index)}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
