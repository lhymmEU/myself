"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Star,
  Loader2,
  Shell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useWishlist, useWishTodos } from "@/lib/swr/hooks";

type SkillLevel = "familiar" | "fluent" | "mastering";

interface Wish {
  id: string;
  name: string;
  targetLevel: SkillLevel;
  priority: string;
  notes: string | null;
  createdAt: number;
}

interface WishTodo {
  id: string;
  wishId: string;
  content: string;
  completed: number;
  sortOrder: number;
}

const LEVEL_BADGE_VARIANT: Record<SkillLevel, "secondary" | "default" | "destructive"> = {
  familiar: "secondary",
  fluent: "default",
  mastering: "destructive",
};

function WishTodoList({ wishId, onTodoCountChange }: { wishId: string; onTodoCountChange?: (count: number) => void }) {
  const { data: todoData, mutate: mutateTodos } = useWishTodos(wishId);
  const todos: WishTodo[] = todoData?.todos ?? [];
  const t = useT();
  const [page, setPage] = useState(0);

  const todoCount = todos.length;
  const countRef = useRef(-1);
  useEffect(() => {
    if (countRef.current !== todoCount) {
      countRef.current = todoCount;
      onTodoCountChange?.(todoCount);
    }
  }, [todoCount, onTodoCountChange]);

  const handleToggle = async (todo: WishTodo) => {
    await fetch("/api/dashboard/wishlist/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: todo.id,
        data: { completed: todo.completed ? 0 : 1 },
      }),
    });
    await mutateTodos();
  };

  if (todos.length === 0) {
    return (
      <div className="pt-1.5 border-t">
        <p className="text-[10px] text-muted-foreground text-center py-1">
          {t("dashboard.game.wishlist.noTodos")}
        </p>
      </div>
    );
  }

  const completedCount = todos.filter((td) => td.completed).length;
  const current = todos[page];
  if (!current) return null;

  return (
    <div className="pt-1.5 border-t space-y-1.5">
      {/* Progress breadcrumb */}
      <div className="flex items-center justify-center gap-1">
        {todos.map((todo, i) => (
          <button
            key={todo.id}
            type="button"
            onClick={() => setPage(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === page ? "w-4" : "w-1.5"
            } ${
              todo.completed
                ? "bg-primary"
                : i === page
                  ? "bg-muted-foreground"
                  : "bg-muted-foreground/30"
            }`}
          />
        ))}
        <span className="text-[9px] text-muted-foreground ml-1.5">
          {completedCount}/{todos.length}
        </span>
      </div>

      {/* Single todo with pagination */}
      <div className="flex items-start gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="h-5 w-5 p-0 shrink-0 mt-0.5"
        >
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <label className="flex items-start gap-1.5 cursor-pointer flex-1 min-w-0">
          <input
            type="checkbox"
            checked={!!current.completed}
            onChange={() => handleToggle(current)}
            className="h-3 w-3 mt-0.5 shrink-0 rounded border accent-primary"
          />
          <span
            className={`text-[10px] leading-tight ${
              current.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {current.content}
          </span>
        </label>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setPage((p) => Math.min(todos.length - 1, p + 1))}
          disabled={page === todos.length - 1}
          className="h-5 w-5 p-0 shrink-0 mt-0.5"
        >
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function WishCard({
  wish,
  onGenerateSteps,
  onEdit,
  onDelete,
  priorityColor,
}: {
  wish: Wish;
  onGenerateSteps: (wish: Wish) => void;
  onEdit: (wish: Wish) => void;
  onDelete: (id: string) => void;
  priorityColor: (p: string) => string;
}) {
  const t = useT();
  const [hasTodos, setHasTodos] = useState(false);

  const handleTodoCountChange = useCallback((count: number) => {
    setHasTodos(count > 0);
  }, []);

  return (
    <Card className="group max-h-[220px] overflow-hidden">
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-start justify-between">
          <span className="text-xs font-medium leading-tight truncate">
            {wish.name}
          </span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {!hasTodos && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onGenerateSteps(wish)}
                className="h-5 w-5 p-0"
                title={t("dashboard.game.wishlist.generateStepsTooltip")}
              >
                <Shell className="h-2.5 w-2.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(wish)}
              className="h-5 w-5 p-0"
            >
              <Pencil className="h-2.5 w-2.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(wish.id)}
              className="h-5 w-5 p-0 text-destructive"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant={LEVEL_BADGE_VARIANT[wish.targetLevel]}
            className="text-[9px] px-1 py-0"
          >
            {t(`dashboard.game.wishlist.level${wish.targetLevel.charAt(0).toUpperCase() + wish.targetLevel.slice(1)}` as "dashboard.game.wishlist.levelFamiliar")}
          </Badge>
          <Badge
            variant={priorityColor(wish.priority) as "default" | "secondary" | "destructive"}
            className="text-[9px] px-1 py-0"
          >
            {wish.priority}
          </Badge>
        </div>
        {wish.notes && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">
            {wish.notes}
          </p>
        )}
        <WishTodoList wishId={wish.id} onTodoCountChange={handleTodoCountChange} />
      </CardContent>
    </Card>
  );
}

export function WishlistSection() {
  const t = useT();
  const router = useRouter();
  const { data: wishData, isLoading: loading, mutate } = useWishlist();
  const wishes: Wish[] = wishData?.wishes ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    targetLevel: SkillLevel;
    priority: string;
    notes: string;
  }>({
    name: "",
    targetLevel: "familiar",
    priority: "medium",
    notes: "",
  });

  const isFull = wishes.length >= 3;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await fetch("/api/dashboard/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: editingId, data: form }),
        });
      } else {
        await fetch("/api/dashboard/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", ...form }),
        });
      }
      setEditingId(null);
      setAdding(false);
      setForm({ name: "", targetLevel: "familiar", priority: "medium", notes: "" });
      await mutate();
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/dashboard/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      await mutate();
    } catch {
      // silently fail
    }
  };

  const startEdit = (wish: Wish) => {
    setEditingId(wish.id);
    setAdding(true);
    setForm({
      name: wish.name,
      targetLevel: wish.targetLevel,
      priority: wish.priority,
      notes: wish.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setForm({ name: "", targetLevel: "familiar", priority: "medium", notes: "" });
  };

  const handleGenerateSteps = useCallback(
    (wish: Wish) => {
      const prompt = encodeURIComponent(
        `I want to learn "${wish.name}" to the "${wish.targetLevel}" level. ${wish.notes ? `Context: ${wish.notes}. ` : ""}Please use the generateWishTodos tool to create up to 5 concrete, actionable learning steps for wish ID "${wish.id}". Each step should be a specific task I can complete to build toward this skill level.`,
      );
      const sessionName = encodeURIComponent(`${wish.name} todo list`);
      router.push(`/dashboard/claw?askClaw=${prompt}&sessionName=${sessionName}`);
    },
    [router],
  );

  const priorityColor = (p: string) => {
    switch (p) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default" as const;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-yellow-500" />
          {t("dashboard.game.wishlist.title")}
        </h2>
        {!adding && !isFull && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("dashboard.game.wishlist.addWish")}
          </Button>
        )}
        {!adding && isFull && (
          <span className="text-[10px] text-muted-foreground">
            {t("dashboard.game.wishlist.limitReached")}
          </span>
        )}
      </div>

      {adding && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("dashboard.game.wishlist.skillNamePlaceholder")}
                className="h-7 text-xs flex-1"
                autoFocus
              />
              <select
                value={form.targetLevel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetLevel: e.target.value as SkillLevel }))
                }
                className="h-7 text-xs rounded-md border bg-transparent px-2"
              >
                <option value="familiar">{t("dashboard.game.wishlist.levelFamiliar")}</option>
                <option value="fluent">{t("dashboard.game.wishlist.levelFluent")}</option>
                <option value="mastering">{t("dashboard.game.wishlist.levelMastering")}</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                className="h-7 text-xs rounded-md border bg-transparent px-2"
              >
                <option value="low">{t("dashboard.game.wishlist.priorityLow")}</option>
                <option value="medium">{t("dashboard.game.wishlist.priorityMedium")}</option>
                <option value="high">{t("dashboard.game.wishlist.priorityHigh")}</option>
              </select>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder={t("dashboard.game.wishlist.notesPlaceholder")}
                className="h-7 text-xs flex-1"
              />
            </div>
            <div className="flex gap-1 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                className="h-6 text-xs"
              >
                <X className="h-3 w-3 mr-0.5" />
                {t("dashboard.game.wishlist.cancelEdit")}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="h-6 text-xs"
              >
                <Check className="h-3 w-3 mr-0.5" />
                {t("dashboard.game.wishlist.saveWish")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {wishes.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {t("dashboard.game.wishlist.noWishes")}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {wishes.map((wish) => (
            <WishCard
              key={wish.id}
              wish={wish}
              onGenerateSteps={handleGenerateSteps}
              onEdit={startEdit}
              onDelete={handleDelete}
              priorityColor={priorityColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
