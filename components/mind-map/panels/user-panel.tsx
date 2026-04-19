"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { PmUserProfile } from "@/lib/modules/mind-map/product-types";
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
import { Plus, Pencil, Trash2, MapPin, User, GripVertical } from "lucide-react";
import { placeEntityOnCanvas, DRAG_DATA_TYPE, type DragEntityData } from "./place-on-canvas";

interface UserPanelProps {
  excalidrawAPI: RefObject<ExcalidrawImperativeAPI | null>;
}

interface FormData {
  name: string;
  type: string;
  typeColor: string;
  contact: string;
  notes: string;
}

const TYPE_COLOR_PRESETS = [
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
];

const emptyForm: FormData = {
  name: "",
  type: "",
  typeColor: "#3b82f6",
  contact: "",
  notes: "",
};

export function UserPanel({ excalidrawAPI }: UserPanelProps) {
  const t = useT();
  const [users, setUsers] = useState<PmUserProfile[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [targetUser, setTargetUser] = useState<PmUserProfile | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/mind-map/users");
      const data: PmUserProfile[] = await res.json();
      data.sort((a, b) => b.updatedAt - a.updatedAt);
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch user profiles:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; setState happens in async callback after fetch
    fetchUsers();
  }, [fetchUsers]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await fetch("/api/mind-map/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/mind-map/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchUsers();
    } catch (err) {
      console.error("Failed to save user profile:", err);
    }
  };

  const handleDelete = async () => {
    if (!targetUser) return;
    try {
      await fetch(`/api/mind-map/users?id=${targetUser.id}`, {
        method: "DELETE",
      });
      setDeleteDialogOpen(false);
      setTargetUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user profile:", err);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: PmUserProfile) => {
    setEditingId(user.id);
    setForm({
      name: user.name,
      type: user.type,
      typeColor: user.typeColor,
      contact: user.contact,
      notes: user.notes,
    });
    setDialogOpen(true);
  };

  const handlePlace = (user: PmUserProfile) => {
    const api = excalidrawAPI.current;
    if (!api) return;
    placeEntityOnCanvas(api, "user", user.name, user.type, user.typeColor);
  };

  const handleDragStart = (e: React.DragEvent, user: PmUserProfile) => {
    const data: DragEntityData = {
      entityType: "user",
      label: user.name,
      subtitle: user.type,
      customColor: user.typeColor,
    };
    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(data));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="p-3 space-y-2">
      <Button size="sm" className="w-full" onClick={openCreate}>
        <Plus className="w-4 h-4" />
        {t("mindMap.product.createUser")}
      </Button>

      {users.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t("mindMap.product.noUsers")}
        </p>
      )}

      {users.map((user) => (
        <div
          key={user.id}
          draggable
          onDragStart={(e) => handleDragStart(e, user)}
          className="group rounded-lg border p-3 space-y-1 transition-colors cursor-grab active:cursor-grabbing"
          style={{ borderColor: `${user.typeColor}33` }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.borderColor = `${user.typeColor}66`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.borderColor = `${user.typeColor}33`)
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              <User
                className="w-4 h-4 shrink-0"
                style={{ color: user.typeColor }}
              />
              <span className="text-sm font-medium truncate">{user.name}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => handlePlace(user)}
                title={t("mindMap.product.placeOnCanvas")}
              >
                <MapPin className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => openEdit(user)}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setTargetUser(user);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          {user.type && (
            <span
              className="inline-block text-[10px] font-medium px-1.5 py-0 rounded-full"
              style={{
                backgroundColor: `${user.typeColor}22`,
                color: user.typeColor,
                border: `1px solid ${user.typeColor}44`,
              }}
            >
              {user.type}
            </span>
          )}
          {user.contact && (
            <p className="text-xs text-muted-foreground truncate">
              {user.contact}
            </p>
          )}
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? t("mindMap.product.editUser")
                : t("mindMap.product.createUser")}
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
              <Label>{t("mindMap.product.userType")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  placeholder={t("mindMap.product.userTypePlaceholder")}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                {TYPE_COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, typeColor: color }))}
                    className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0"
                    style={{
                      backgroundColor: color,
                      borderColor:
                        form.typeColor === color
                          ? "#ffffff"
                          : "transparent",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.typeColor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, typeColor: e.target.value }))
                  }
                  className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 bg-transparent"
                  title={t("mindMap.product.customColor")}
                />
              </div>
            </div>
            <div>
              <Label>{t("mindMap.product.contact")}</Label>
              <Textarea
                value={form.contact}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact: e.target.value }))
                }
                placeholder={t("mindMap.product.contactPlaceholder")}
                rows={2}
              />
            </div>
            <div>
              <Label>{t("mindMap.product.notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
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
          {targetUser && (
            <p className="text-sm font-medium">
              &ldquo;{targetUser.name}&rdquo;
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
