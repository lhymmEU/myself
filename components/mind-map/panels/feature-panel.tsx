"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  PmFeature,
  FeatureStatus,
  FeaturePriority,
} from "@/lib/modules/mind-map/product-types";
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MapPin, Blocks, GripVertical } from "lucide-react";
import { placeEntityOnCanvas, DRAG_DATA_TYPE, type DragEntityData } from "./place-on-canvas";

interface FeaturePanelProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

interface FormData {
  name: string;
  description: string;
  status: FeatureStatus;
  priority: FeaturePriority;
  notes: string;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  status: "planned",
  priority: "medium",
  notes: "",
};

const STATUS_VARIANT: Record<FeatureStatus, "default" | "secondary" | "outline"> = {
  planned: "secondary",
  "in-progress": "default",
  done: "outline",
};

const PRIORITY_VARIANT: Record<FeaturePriority, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

export function FeaturePanel({ excalidrawAPI }: FeaturePanelProps) {
  const t = useT();
  const [features, setFeatures] = useState<PmFeature[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetFeature, setTargetFeature] = useState<PmFeature | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await fetch("/api/mind-map/features");
      const data: PmFeature[] = await res.json();
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setFeatures(data);
    } catch (err) {
      console.error("Failed to fetch features:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; setState happens in async callback after fetch
    fetchFeatures();
  }, [fetchFeatures]);

  const statusLabel = (s: FeatureStatus) => {
    const map: Record<FeatureStatus, string> = {
      planned: t("mindMap.product.statusPlanned"),
      "in-progress": t("mindMap.product.statusInProgress"),
      done: t("mindMap.product.statusDone"),
    };
    return map[s];
  };

  const priorityLabel = (p: FeaturePriority) => {
    const map: Record<FeaturePriority, string> = {
      low: t("mindMap.product.priorityLow"),
      medium: t("mindMap.product.priorityMedium"),
      high: t("mindMap.product.priorityHigh"),
      critical: t("mindMap.product.priorityCritical"),
    };
    return map[p];
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await fetch("/api/mind-map/features", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/mind-map/features", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchFeatures();
    } catch (err) {
      console.error("Failed to save feature:", err);
    }
  };

  const handleDelete = async () => {
    if (!targetFeature) return;
    try {
      await fetch(`/api/mind-map/features?id=${targetFeature.id}`, {
        method: "DELETE",
      });
      setDeleteDialogOpen(false);
      setTargetFeature(null);
      fetchFeatures();
    } catch (err) {
      console.error("Failed to delete feature:", err);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (feature: PmFeature) => {
    setEditingId(feature.id);
    setForm({
      name: feature.name,
      description: feature.description,
      status: feature.status,
      priority: feature.priority,
      notes: feature.notes,
    });
    setDialogOpen(true);
  };

  const handlePlace = (feature: PmFeature) => {
    const api = excalidrawAPI.current;
    if (!api) return;
    placeEntityOnCanvas(
      api,
      "feature",
      feature.name,
      `${statusLabel(feature.status)} · ${priorityLabel(feature.priority)}`
    );
  };

  const handleDragStart = (e: React.DragEvent, feature: PmFeature) => {
    const data: DragEntityData = {
      entityType: "feature",
      label: feature.name,
      subtitle: `${statusLabel(feature.status)} · ${priorityLabel(feature.priority)}`,
    };
    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="p-3 space-y-2">
      <Button size="sm" className="w-full" onClick={openCreate}>
        <Plus className="w-4 h-4" />
        {t("mindMap.product.createFeature")}
      </Button>

      {features.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("mindMap.product.noFeatures")}
        </p>
      )}

      {features.map((feature) => (
        <div
          key={feature.id}
          draggable
          onDragStart={(e) => handleDragStart(e, feature)}
          className="group rounded-lg border p-3 space-y-1.5 hover:border-green-500/40 transition-colors cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <Blocks className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-sm font-medium truncate">
                {feature.name}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handlePlace(feature)}
                title={t("mindMap.product.placeOnCanvas")}
              >
                <MapPin className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEdit(feature)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setTargetFeature(feature);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant={STATUS_VARIANT[feature.status]} className="text-[10px] px-1.5 py-0">
              {statusLabel(feature.status)}
            </Badge>
            <Badge variant={PRIORITY_VARIANT[feature.priority]} className="text-[10px] px-1.5 py-0">
              {priorityLabel(feature.priority)}
            </Badge>
          </div>
          {feature.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {feature.description}
            </p>
          )}
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("mindMap.product.editFeature")
                : t("mindMap.product.createFeature")}
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
              <Label>{t("mindMap.product.description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("mindMap.product.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as FeatureStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">
                      {t("mindMap.product.statusPlanned")}
                    </SelectItem>
                    <SelectItem value="in-progress">
                      {t("mindMap.product.statusInProgress")}
                    </SelectItem>
                    <SelectItem value="done">
                      {t("mindMap.product.statusDone")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("mindMap.product.priority")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v as FeaturePriority }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      {t("mindMap.product.priorityLow")}
                    </SelectItem>
                    <SelectItem value="medium">
                      {t("mindMap.product.priorityMedium")}
                    </SelectItem>
                    <SelectItem value="high">
                      {t("mindMap.product.priorityHigh")}
                    </SelectItem>
                    <SelectItem value="critical">
                      {t("mindMap.product.priorityCritical")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("mindMap.product.notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={2}
              />
            </div>
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
          {targetFeature && (
            <p className="text-sm font-medium">
              &ldquo;{targetFeature.name}&rdquo;
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
    </div>
  );
}
