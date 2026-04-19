"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  User,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Swords,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { useT } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";
import { useUserSkills, useCharacterAppearance } from "@/lib/swr/hooks";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import type { UserColors } from "./vrm-viewer";

const CharacterViewer = dynamic(
  () =>
    import("@/components/dashboard/vrm-viewer").then((m) => m.CharacterViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 min-h-[200px] rounded-md bg-muted/30 animate-pulse" />
    ),
  }
);

type SkillLevel = "familiar" | "fluent" | "mastering";

interface UserSkill {
  id: string;
  name: string;
  level: SkillLevel;
  category: string | null;
  createdAt: number;
}

const LEVEL_BADGE_VARIANT: Record<SkillLevel, "secondary" | "default" | "destructive"> = {
  familiar: "secondary",
  fluent: "default",
  mastering: "destructive",
};

const DEFAULT_USER_COLORS: Required<UserColors> = {
  skin: "#ffe0bd",
  hair: "#3b2f2f",
  shirt: "#4f8ef7",
  pants: "#2d3748",
  shoe: "#1a1a2e",
};

const COLOR_LABELS: Record<keyof UserColors, string> = {
  skin: "Skin",
  hair: "Hair",
  shirt: "Shirt",
  pants: "Pants",
  shoe: "Shoes",
};

export function UserPanel() {
  const t = useT();
  const router = useRouter();
  const { data: skillsData, mutate: mutateSkills } = useUserSkills();
  const { data: appearanceData } = useCharacterAppearance("user");
  const skills: UserSkill[] = skillsData?.skills ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ name: string; level: SkillLevel; category: string }>({ name: "", level: "familiar", category: "" });

  const userColorsFromApi: Required<UserColors> = appearanceData?.appearance
    ? {
        skin: appearanceData.appearance.skinColor ?? DEFAULT_USER_COLORS.skin,
        hair: appearanceData.appearance.hairColor ?? DEFAULT_USER_COLORS.hair,
        shirt: appearanceData.appearance.shirtColor ?? DEFAULT_USER_COLORS.shirt,
        pants: appearanceData.appearance.pantsColor ?? DEFAULT_USER_COLORS.pants,
        shoe: appearanceData.appearance.shoeColor ?? DEFAULT_USER_COLORS.shoe,
      }
    : DEFAULT_USER_COLORS;
  const [userColors, setUserColors] = useState<Required<UserColors>>(DEFAULT_USER_COLORS);
  const [colorsInitialized, setColorsInitialized] = useState(false);
  if (appearanceData && !colorsInitialized) {
    setUserColors(userColorsFromApi);
    setColorsInitialized(true);
  }

  const saveAppearance = useCallback(async (colors: Required<UserColors>) => {
    try {
      await fetch("/api/dashboard/appearance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterType: "user",
          skinColor: colors.skin,
          hairColor: colors.hair,
          shirtColor: colors.shirt,
          pantsColor: colors.pants,
          shoeColor: colors.shoe,
        }),
      });
    } catch {
      // silently fail
    }
  }, []);

  const handleColorChange = (key: keyof UserColors, value: string) => {
    const updated = { ...userColors, [key]: value };
    setUserColors(updated);
    saveAppearance(updated);
  };

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
      setForm({ name: "", level: "familiar", category: "" });
      await mutateSkills();
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
      await mutateSkills();
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
    setForm({ name: "", level: "familiar", category: "" });
  };

  const handleVerifySkill = useCallback(
    (skill: UserSkill) => {
      const levelLabel = t(`dashboard.game.userPanel.level${skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}` as "dashboard.game.userPanel.levelFamiliar");
      const prompt = encodeURIComponent(
        `I claim "${levelLabel}" proficiency in "${skill.name}". Please design a comprehensive, real-world skill assessment: present practical scenarios and challenges that professionals actually encounter with this skill at the "${levelLabel}" tier, evaluate my responses, and give an honest verdict on whether my claimed level is accurate.`,
      );
      const sessionName = encodeURIComponent(`${skill.name} verification`);
      router.push(`/dashboard/claw?askClaw=${prompt}&sessionName=${sessionName}`);
    },
    [router, t],
  );

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <User className="h-4 w-4" />
          {t("dashboard.game.userPanel.title")}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                <Palette className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-2">
                {(Object.keys(COLOR_LABELS) as (keyof UserColors)[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="color"
                      value={userColors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="h-5 w-5 rounded border cursor-pointer"
                    />
                    <span>{COLOR_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
        <CharacterViewer
          type="user"
          userColors={userColors}
          className="flex-1 min-h-[200px] rounded-lg bg-gradient-to-b from-muted/20 to-muted/50 overflow-hidden"
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
              <select
                value={form.level}
                onChange={(e) =>
                  setForm((f) => ({ ...f, level: e.target.value as SkillLevel }))
                }
                className="h-6 text-xs rounded-md border bg-transparent px-1.5"
              >
                <option value="familiar">{t("dashboard.game.userPanel.levelFamiliar")}</option>
                <option value="fluent">{t("dashboard.game.userPanel.levelFluent")}</option>
                <option value="mastering">{t("dashboard.game.userPanel.levelMastering")}</option>
              </select>
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
                      <Badge
                        variant={LEVEL_BADGE_VARIANT[skill.level]}
                        className="text-[9px] px-1 py-0 shrink-0"
                      >
                        {t(`dashboard.game.userPanel.level${skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}` as "dashboard.game.userPanel.levelFamiliar")}
                      </Badge>
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
                      onClick={() => handleVerifySkill(skill)}
                      className="h-5 w-5 p-0"
                      title={t("dashboard.game.userPanel.verifySkill")}
                    >
                      <ShieldCheck className="h-2.5 w-2.5" />
                    </Button>
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
