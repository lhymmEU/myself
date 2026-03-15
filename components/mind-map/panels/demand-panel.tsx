"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type {
  PmDemand,
  DemandType,
  DemandStatus,
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
import { Plus, Pencil, Trash2, MapPin, Target } from "lucide-react";
import { placeEntityOnCanvas } from "./place-on-canvas";

interface DemandPanelProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

interface FormData {
  title: string;
  description: string;
  type: DemandType;
  status: DemandStatus;
  evidence: string;
}

const emptyForm: FormData = {
  title: "",
  description: "",
  type: "demand",
  status: "unvalidated",
  evidence: "",
};

const STATUS_VARIANT: Record<DemandStatus, "default" | "secondary" | "destructive" | "outline"> = {
  unvalidated: "secondary",
  validating: "default",
  validated: "outline",
  invalidated: "destructive",
};

export function DemandPanel({ excalidrawAPI }: DemandPanelProps) {
  const t = useT();
  const [demands, setDemands] = useState<PmDemand[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetDemand, setTargetDemand] = useState<PmDemand | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchDemands = useCallback(async () => {
    try {
      const res = await fetch("/api/mind-map/demands");
      const data: PmDemand[] = await res.json();
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setDemands(data);
    } catch (err) {
      console.error("Failed to fetch demands:", err);
    }
  }, []);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const typeLabel = (dt: DemandType) => {
    const map: Record<DemandType, string> = {
      demand: t("mindMap.product.typeDemand"),
      assumption: t("mindMap.product.typeAssumption"),
    };
    return map[dt];
  };

  const statusLabel = (s: DemandStatus) => {
    const map: Record<DemandStatus, string> = {
      unvalidated: t("mindMap.product.statusUnvalidated"),
      validating: t("mindMap.product.statusValidating"),
      validated: t("mindMap.product.statusValidated"),
      invalidated: t("mindMap.product.statusInvalidated"),
    };
    return map[s];
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      if (editingId) {
        await fetch("/api/mind-map/demands", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/mind-map/demands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchDemands();
    } catch (err) {
      console.error("Failed to save demand:", err);
    }
  };

  const handleDelete = async () => {
    if (!targetDemand) return;
    try {
      await fetch(`/api/mind-map/demands?id=${targetDemand.id}`, {
        method: "DELETE",
      });
      setDeleteDialogOpen(false);
      setTargetDemand(null);
      fetchDemands();
    } catch (err) {
      console.error("Failed to delete demand:", err);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (demand: PmDemand) => {
    setEditingId(demand.id);
    setForm({
      title: demand.title,
      description: demand.description,
      type: demand.type,
      status: demand.status,
      evidence: demand.evidence,
    });
    setDialogOpen(true);
  };

  const handlePlace = (demand: PmDemand) => {
    const api = excalidrawAPI.current;
    if (!api) return;
    placeEntityOnCanvas(
      api,
      "demand",
      demand.title,
      `${typeLabel(demand.type)} · ${statusLabel(demand.status)}`
    );
  };

  return (
    <div className="p-3 space-y-2">
      <Button size="sm" className="w-full" onClick={openCreate}>
        <Plus className="w-4 h-4" />
        {t("mindMap.product.createDemand")}
      </Button>

      {demands.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("mindMap.product.noDemands")}
        </p>
      )}

      {demands.map((demand) => (
        <div
          key={demand.id}
          className="group rounded-lg border p-3 space-y-1.5 hover:border-orange-500/40 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 text-orange-400 shrink-0" />
              <span className="text-sm font-medium truncate">
                {demand.title}
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handlePlace(demand)}
                title={t("mindMap.product.placeOnCanvas")}
              >
                <MapPin className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEdit(demand)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setTargetDemand(demand);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={demand.type === "demand" ? "default" : "secondary"}
              className="text-[10px] px-1.5 py-0"
            >
              {typeLabel(demand.type)}
            </Badge>
            <Badge
              variant={STATUS_VARIANT[demand.status]}
              className="text-[10px] px-1.5 py-0"
            >
              {statusLabel(demand.status)}
            </Badge>
          </div>
          {demand.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {demand.description}
            </p>
          )}
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("mindMap.product.editDemand")
                : t("mindMap.product.createDemand")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{t("mindMap.product.title")}</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
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
                <Label>{t("mindMap.product.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, type: v as DemandType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="demand">
                      {t("mindMap.product.typeDemand")}
                    </SelectItem>
                    <SelectItem value="assumption">
                      {t("mindMap.product.typeAssumption")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("mindMap.product.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as DemandStatus }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unvalidated">
                      {t("mindMap.product.statusUnvalidated")}
                    </SelectItem>
                    <SelectItem value="validating">
                      {t("mindMap.product.statusValidating")}
                    </SelectItem>
                    <SelectItem value="validated">
                      {t("mindMap.product.statusValidated")}
                    </SelectItem>
                    <SelectItem value="invalidated">
                      {t("mindMap.product.statusInvalidated")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t("mindMap.product.evidence")}</Label>
              <Textarea
                value={form.evidence}
                onChange={(e) =>
                  setForm((f) => ({ ...f, evidence: e.target.value }))
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
          {targetDemand && (
            <p className="text-sm font-medium">
              &ldquo;{targetDemand.title}&rdquo;
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
