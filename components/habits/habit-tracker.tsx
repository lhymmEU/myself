"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Flame, Check, Loader2 } from "lucide-react";
import type { Habit } from "@/lib/modules/habits/types";

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Days(): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

interface HabitTrackerProps {
  onSelectHabit?: (habit: Habit) => void;
  selectedHabitId?: string | null;
}

export function HabitTracker({ onSelectHabit, selectedHabitId }: HabitTrackerProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFrequency, setNewFrequency] = useState<"daily" | "weekly">("daily");
  const [submitting, setSubmitting] = useState(false);

  const fetchHabits = useCallback(async () => {
    try {
      const [habitsRes, streaksRes] = await Promise.all([
        fetch("/api/habits?action=list"),
        fetch("/api/habits?action=streaks"),
      ]);
      if (habitsRes.ok) setHabits(await habitsRes.json());
      if (streaksRes.ok) {
        const data: { id: string; streak: number }[] = await streaksRes.json();
        const map: Record<string, number> = {};
        data.forEach((s) => (map[s.id] = s.streak));
        setStreaks(map);
      }
    } catch {
      // network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), frequency: newFrequency }),
      });
      if (res.ok) {
        setNewName("");
        setNewFrequency("daily");
        setDialogOpen(false);
        await fetchHabits();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleToday(habit: Habit) {
    const today = getToday();
    if (habit.completions.includes(today)) return;
    setHabits((prev) =>
      prev.map((h) =>
        h.id === habit.id
          ? { ...h, completions: [...h.completions, today] }
          : h
      )
    );
    await fetch("/api/habits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: habit.id, date: today }),
    });
    fetchHabits();
  }

  async function handleDelete(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/habits?id=${id}`, { method: "DELETE" });
  }

  const last7 = getLast7Days();
  const today = getToday();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Habits</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Habit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="habit-name">Name</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g. Exercise, Read, Meditate"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="daily"
                      checked={newFrequency === "daily"}
                      onChange={() => setNewFrequency("daily")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Daily</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={newFrequency === "weekly"}
                      onChange={() => setNewFrequency("weekly")}
                      className="accent-primary"
                    />
                    <span className="text-sm">Weekly</span>
                  </label>
                </div>
              </div>
              <Button type="submit" disabled={!newName.trim() || submitting} className="w-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Habit"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No habits yet. Add one to start tracking!
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const completedToday = habit.completions.includes(today);
            const streak = streaks[habit.id] ?? 0;
            const isSelected = selectedHabitId === habit.id;

            return (
              <div
                key={habit.id}
                className={`group flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                  isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
                onClick={() => onSelectHabit?.(habit)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{habit.name}</span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {habit.frequency}
                    </Badge>
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-orange-500 shrink-0">
                        <Flame className="h-3.5 w-3.5" />
                        {streak}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5">
                    {last7.map((day) => {
                      const done = habit.completions.includes(day);
                      return (
                        <div
                          key={day}
                          className={`h-2.5 w-2.5 rounded-full ${
                            done
                              ? "bg-emerald-500"
                              : "bg-muted-foreground/20"
                          }`}
                          title={`${day}: ${done ? "completed" : "not completed"}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={completedToday ? "secondary" : "default"}
                  className="shrink-0"
                  disabled={completedToday}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleToday(habit);
                  }}
                >
                  <Check className="h-4 w-4" />
                  {completedToday ? "Done" : "Today"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(habit.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
