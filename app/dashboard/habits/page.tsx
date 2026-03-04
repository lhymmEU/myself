"use client";

import { useState } from "react";
import { HabitTracker } from "@/components/habits/habit-tracker";
import { Heatmap } from "@/components/habits/heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Habit } from "@/lib/modules/habits/types";

export default function HabitsPage() {
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Habit Tracker</h1>
        <p className="text-muted-foreground">Build consistency, one day at a time</p>
      </div>

      <HabitTracker
        onSelectHabit={setSelectedHabit}
        selectedHabitId={selectedHabit?.id ?? null}
      />

      {selectedHabit && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {selectedHabit.name} — Last 90 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap completions={selectedHabit.completions} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
