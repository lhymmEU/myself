"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface Wish {
  id: string;
  name: string;
  targetLevel: number;
  priority: string;
  notes: string | null;
  createdAt: number;
}

export function WishlistSection() {
  const t = useT();
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    name: "",
    targetLevel: 5,
    priority: "medium",
    notes: "",
  });

  const fetchWishes = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/wishlist");
      const data = await res.json();
      setWishes(data.wishes ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

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
      setForm({ name: "", targetLevel: 5, priority: "medium", notes: "" });
      await fetchWishes();
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
      await fetchWishes();
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
    setForm({ name: "", targetLevel: 5, priority: "medium", notes: "" });
  };

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
        {!adding && (
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
              <Input
                type="number"
                value={form.targetLevel}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    targetLevel: parseInt(e.target.value) || 1,
                  }))
                }
                className="h-7 text-xs w-16"
                min={1}
                max={10}
              />
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
        <div className="flex gap-3 overflow-x-auto pb-1">
          {wishes.map((wish) => (
            <Card
              key={wish.id}
              className="shrink-0 w-[180px] group"
            >
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-medium leading-tight">
                    {wish.name}
                  </span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(wish)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(wish.id)}
                      className="h-5 w-5 p-0 text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">
                    Lv {wish.targetLevel}
                  </span>
                  <Badge
                    variant={priorityColor(wish.priority) as "default" | "secondary" | "destructive"}
                    className="text-[9px] px-1 py-0"
                  >
                    {wish.priority}
                  </Badge>
                </div>
                {wish.notes && (
                  <p className="text-[10px] text-muted-foreground line-clamp-2">
                    {wish.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
