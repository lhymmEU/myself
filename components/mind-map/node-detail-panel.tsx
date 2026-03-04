"use client";

import { useState, useEffect } from "react";
import { Trash2, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const COLOR_PRESETS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
];

export interface NodeData {
  id: string;
  label: string;
  type: "category" | "item";
  color: string;
  connections: string[];
  metadata: Record<string, unknown>;
}

interface NodeDetailPanelProps {
  node: NodeData | null;
  allNodes: NodeData[];
  onClose: () => void;
  onUpdate: (data: Partial<NodeData> & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function NodeDetailPanel({
  node,
  allNodes,
  onClose,
  onUpdate,
  onDelete,
}: NodeDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState("");

  useEffect(() => {
    if (node) {
      setEditLabel(node.label);
      setIsEditing(false);
    }
  }, [node]);

  if (!node) return null;

  const connectedNodes = allNodes.filter((n) => node.connections.includes(n.id));

  function handleSaveLabel() {
    if (!editLabel.trim() || !node) return;
    onUpdate({ id: node.id, label: editLabel.trim() });
    setIsEditing(false);
  }

  function handleColorChange(color: string) {
    if (!node) return;
    onUpdate({ id: node.id, color });
  }

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[340px] sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: node.color }}
            />
            {isEditing ? (
              <div className="flex items-center gap-1 flex-1">
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveLabel();
                    if (e.key === "Escape") setIsEditing(false);
                  }}
                  autoFocus
                />
                <Button size="icon-xs" variant="ghost" onClick={handleSaveLabel}>
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setIsEditing(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:underline"
                onClick={() => setIsEditing(true)}
              >
                {node.label}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground text-xs">Type</Label>
            <Badge variant="outline">{node.type}</Badge>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`
                    w-6 h-6 rounded-full transition-all
                    ${node.color === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "hover:scale-105"}
                  `}
                  style={{ backgroundColor: c }}
                  onClick={() => handleColorChange(c)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">
              Connections ({connectedNodes.length})
            </Label>
            {connectedNodes.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">
                No connections yet. Drag between nodes to connect them.
              </p>
            ) : (
              <div className="space-y-1">
                {connectedNodes.map((cn) => (
                  <div
                    key={cn.id}
                    className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-md bg-muted/50"
                  >
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: cn.color }}
                    />
                    <span className="truncate">{cn.label}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto">
                      {cn.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">Linked Todos</Label>
            <p className="text-xs text-muted-foreground/60">
              No linked todos yet.
            </p>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Node
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
