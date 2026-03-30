"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Swords,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import dynamic from "next/dynamic";

const CharacterViewer = dynamic(
  () =>
    import("@/components/dashboard/vrm-viewer").then((m) => m.CharacterViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] rounded-md bg-muted/30 animate-pulse" />
    ),
  }
);

interface UserSkill {
  id: string;
  name: string;
  level: number;
  category: string | null;
  createdAt: number;
}

export function UserPanel() {
  const t = useT();
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", level: 1, category: "" });

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/skills");
      const data = await res.json();
      setSkills(data.skills ?? []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await fetch("/api/dashboard/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: editingId, data: form }),
        });
      } else {
        await fetch("/api/dashboard/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", ...form }),
        });
      }
      setEditingId(null);
      setAdding(false);
      setForm({ name: "", level: 1, category: "" });
      await fetchSkills();
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch("/api/dashboard/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      await fetchSkills();
    } catch {
      // silently fail
    }
  };

  const startEdit = (skill: UserSkill) => {
    setEditingId(skill.id);
    setAdding(true);
    setForm({
      name: skill.name,
      level: skill.level,
      category: skill.category ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAdding(false);
    setForm({ name: "", level: 1, category: "" });
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("dashboard.game.userPanel.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <CharacterViewer
          type="user"
          className="h-[300px] rounded-lg bg-gradient-to-b from-muted/20 to-muted/50 overflow-hidden"
        />

        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold flex items-center gap-1.5">
            <Swords className="h-3.5 w-3.5" />
            {t("dashboard.game.userPanel.skills")}
          </h3>
          {!adding && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAdding(true)}
              className="h-6 text-xs"
            >
              <Plus className="h-3 w-3 mr-0.5" />
              {t("dashboard.game.userPanel.addSkill")}
            </Button>
          )}
        </div>

        {adding && (
          <div className="space-y-1.5 p-2 rounded-md border bg-muted/30">
            <div className="flex gap-1.5">
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder={t("dashboard.game.userPanel.skillNamePlaceholder")}
                className="h-6 text-xs flex-1"
                autoFocus
              />
              <Input
                type="number"
                value={form.level}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    level: parseInt(e.target.value) || 1,
                  }))
                }
                className="h-6 text-xs w-14"
                min={1}
                max={10}
              />
            </div>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
              placeholder={t("dashboard.game.userPanel.skillCategoryPlaceholder")}
              className="h-6 text-xs"
            />
            <div className="flex gap-1 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEdit}
                className="h-5 px-1.5 text-[10px]"
              >
                <X className="h-2.5 w-2.5" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="h-5 px-1.5 text-[10px]"
              >
                <Check className="h-2.5 w-2.5" />
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-0.5">
            {skills.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-3">
                {t("dashboard.game.userPanel.noSkills")}
              </p>
            ) : (
              skills.map((skill) => (
                <div
                  key={skill.id}
                  className="group flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">
                        {skill.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        Lv {skill.level}
                      </span>
                    </div>
                    {skill.category && (
                      <span className="text-[10px] text-muted-foreground">
                        {skill.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(skill)}
                      className="h-5 w-5 p-0"
                    >
                      <Pencil className="h-2.5 w-2.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(skill.id)}
                      className="h-5 w-5 p-0 text-destructive"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
