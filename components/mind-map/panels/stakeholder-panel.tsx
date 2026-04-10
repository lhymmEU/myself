"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { PmStakeholder, StakeholderDetail } from "@/lib/modules/mind-map/product-types";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Shell,
  Users,
} from "lucide-react";
import { placeEntityOnCanvas, DRAG_DATA_TYPE, type DragEntityData } from "./place-on-canvas";

interface StakeholderPanelProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

interface FormData {
  name: string;
  role: string;
  roleColor: string;
  objectives: string;
  desires: string;
  requirements: string;
  expectations: string;
}

const ROLE_COLOR_PRESETS = [
  "#8b5cf6",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

const emptyForm: FormData = {
  name: "",
  role: "",
  roleColor: "#8b5cf6",
  objectives: "",
  desires: "",
  requirements: "",
  expectations: "",
};

export function StakeholderPanel({ excalidrawAPI }: StakeholderPanelProps) {
  const t = useT();
  const router = useRouter();
  const [stakeholders, setStakeholders] = useState<PmStakeholder[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetStakeholder, setTargetStakeholder] = useState<PmStakeholder | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [sectionNotes, setSectionNotes] = useState("");
  const [notesSaveTimer, setNotesSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const fetchSectionNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.pm_stakeholder_section_notes) {
        setSectionNotes(data.pm_stakeholder_section_notes);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveSectionNotes = useCallback((value: string) => {
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "pm_stakeholder_section_notes", value }),
    }).catch(() => {});
  }, []);

  const handleSectionNotesChange = (value: string) => {
    setSectionNotes(value);
    if (notesSaveTimer) clearTimeout(notesSaveTimer);
    setNotesSaveTimer(setTimeout(() => saveSectionNotes(value), 800));
  };

  const fetchStakeholders = useCallback(async () => {
    try {
      const res = await fetch("/api/mind-map/stakeholders");
      const data: PmStakeholder[] = await res.json();
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setStakeholders(data);
    } catch (err) {
      console.error("Failed to fetch stakeholders:", err);
    }
  }, []);

  useEffect(() => {
    fetchStakeholders();
    fetchSectionNotes();
  }, [fetchStakeholders, fetchSectionNotes]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const body = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        role: form.role,
        roleColor: form.roleColor,
        details: {
          objectives: form.objectives,
          desires: form.desires,
          requirements: form.requirements,
          expectations: form.expectations,
        },
      };
      await fetch("/api/mind-map/stakeholders", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchStakeholders();
    } catch (err) {
      console.error("Failed to save stakeholder:", err);
    }
  };

  const handleDelete = async () => {
    if (!targetStakeholder) return;
    try {
      await fetch(`/api/mind-map/stakeholders?id=${targetStakeholder.id}`, {
        method: "DELETE",
      });
      setDeleteDialogOpen(false);
      setTargetStakeholder(null);
      fetchStakeholders();
    } catch (err) {
      console.error("Failed to delete stakeholder:", err);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: PmStakeholder) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      role: s.role,
      roleColor: s.roleColor,
      objectives: s.details.objectives,
      desires: s.details.desires,
      requirements: s.details.requirements,
      expectations: s.details.expectations,
    });
    setDialogOpen(true);
  };

  const handlePlace = (s: PmStakeholder) => {
    const api = excalidrawAPI.current;
    if (!api) return;
    placeEntityOnCanvas(api, "stakeholder", s.name, s.role, s.roleColor);
  };

  const handleDragStart = (e: React.DragEvent, s: PmStakeholder) => {
    const data: DragEntityData = {
      entityType: "stakeholder",
      label: s.name,
      subtitle: s.role,
      customColor: s.roleColor,
    };
    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleAskClaw = () => {
    if (stakeholders.length === 0) return;

    const stakeholderBlocks = stakeholders.map((s, i) => {
      const lines = [
        `[Stakeholder ${i + 1}: ${s.name}${s.role ? ` - ${s.role}` : ""}]`,
        s.details.objectives ? `- Objectives: ${s.details.objectives}` : null,
        s.details.desires ? `- Desires: ${s.details.desires}` : null,
        s.details.requirements ? `- Requirements: ${s.details.requirements}` : null,
        s.details.expectations ? `- Expectations: ${s.details.expectations}` : null,
      ];
      return lines.filter(Boolean).join("\n");
    }).join("\n\n");

    const prompt = `Analyze the following product stakeholders and their needs:\n\n${stakeholderBlocks}\n\nPlease provide:\n1. STAKEHOLDER GAP ANALYSIS: Identify conflicts and gaps between stakeholders. Suggest the minimum set of features to build that satisfies the most critical needs across all stakeholders, keeping the product lean.\n\n2. MARKET RESEARCH: What existing products, tools, and open-source projects have already built solutions addressing these stakeholder needs? Include links and brief descriptions.`;

    router.push(`/dashboard/claw?askClaw=${encodeURIComponent(prompt.slice(0, 4000))}`);
  };

  const detailFields: { key: keyof StakeholderDetail; labelKey: string; placeholderKey: string }[] = [
    { key: "objectives", labelKey: "mindMap.product.objectives", placeholderKey: "mindMap.product.objectivesPlaceholder" },
    { key: "desires", labelKey: "mindMap.product.desires", placeholderKey: "mindMap.product.desiresPlaceholder" },
    { key: "requirements", labelKey: "mindMap.product.requirements", placeholderKey: "mindMap.product.requirementsPlaceholder" },
    { key: "expectations", labelKey: "mindMap.product.expectations", placeholderKey: "mindMap.product.expectationsPlaceholder" },
  ];

  return (
    <>
      <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
        <div className="flex items-center justify-between px-3 py-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground transition-colors">
              {sectionOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              <Users className="w-3.5 h-3.5" />
              {t("mindMap.product.stakeholders")}
            </button>
          </CollapsibleTrigger>
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={openCreate}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {stakeholders.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {t("mindMap.product.noStakeholders")}
              </p>
            )}

            {stakeholders.map((s) => (
              <Collapsible
                key={s.id}
                open={expandedId === s.id}
                onOpenChange={(open) => setExpandedId(open ? s.id : null)}
              >
                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, s)}
                  className="group rounded-lg border p-2.5 space-y-1 transition-colors cursor-grab active:cursor-grabbing"
                  style={{ borderColor: `${s.roleColor}33` }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = `${s.roleColor}66`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = `${s.roleColor}33`)
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-1.5 min-w-0">
                          {expandedId === s.id ? (
                            <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium truncate">{s.name}</span>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handlePlace(s)}
                        title={t("mindMap.product.placeOnCanvas")}
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => {
                          setTargetStakeholder(s);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {s.role && (
                    <span
                      className="inline-block text-[10px] font-medium px-1.5 py-0 rounded-full ml-5"
                      style={{
                        backgroundColor: `${s.roleColor}22`,
                        color: s.roleColor,
                        border: `1px solid ${s.roleColor}44`,
                      }}
                    >
                      {s.role}
                    </span>
                  )}

                  <CollapsibleContent>
                    <div className="mt-2 ml-5 space-y-2">
                      {detailFields.map(({ key, labelKey }) => {
                        const val = s.details[key];
                        if (!val) return null;
                        return (
                          <div key={key}>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                              {t(labelKey)}
                            </p>
                            <p className="text-xs mt-0.5 whitespace-pre-wrap">{val}</p>
                          </div>
                        );
                      })}

                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}

            {stakeholders.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={handleAskClaw}
              >
                <Shell className="w-3.5 h-3.5" />
                {t("mindMap.product.askClaw")}
              </Button>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">
                {t("mindMap.product.sectionNotes")}
              </Label>
              <Textarea
                value={sectionNotes}
                onChange={(e) => handleSectionNotesChange(e.target.value)}
                placeholder={t("mindMap.product.sectionNotesPlaceholder")}
                rows={3}
                className="text-xs mt-1"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("mindMap.product.editStakeholder")
                : t("mindMap.product.createStakeholder")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("mindMap.product.name")}</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                autoFocus
              />
            </div>
            <div>
              <Label>{t("mindMap.product.role")}</Label>
              <Input
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value }))
                }
                placeholder={t("mindMap.product.rolePlaceholder")}
              />
              <div className="flex items-center gap-1.5 mt-2">
                {ROLE_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, roleColor: color }))}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        form.roleColor === color ? "#ffffff" : "transparent",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.roleColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, roleColor: e.target.value }))
                  }
                  className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title={t("mindMap.product.customColor")}
                />
              </div>
            </div>
            {detailFields.map(({ key, labelKey, placeholderKey }) => (
              <div key={key}>
                <Label>{t(labelKey)}</Label>
                <Textarea
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  placeholder={t(placeholderKey)}
                  rows={2}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("mindMap.product.cancel")}
            </Button>
            <Button onClick={handleSave}>{t("mindMap.product.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("mindMap.product.delete")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("mindMap.product.deleteConfirm")}
          </p>
          {targetStakeholder && (
            <p className="text-sm font-medium">
              &ldquo;{targetStakeholder.name}&rdquo;
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {t("mindMap.product.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              {t("mindMap.product.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
