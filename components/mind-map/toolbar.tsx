"use client";

import { useState } from "react";
import { Plus, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface ToolbarProps {
  onAdd: (data: {
    label: string;
    type: "category" | "item";
    color: string;
  }) => void;
}

export function Toolbar({ onAdd }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
      <Network className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-muted-foreground mr-2">Tools</span>
      <AddNodeDialog type="category" onAdd={onAdd} />
      <AddNodeDialog type="item" onAdd={onAdd} />
    </div>
  );
}

function AddNodeDialog({
  type,
  onAdd,
}: {
  type: "category" | "item";
  onAdd: ToolbarProps["onAdd"];
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);

  function handleSubmit() {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), type, color });
    setLabel("");
    setColor(COLOR_PRESETS[0]);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
          Add {type === "category" ? "Category" : "Item"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            New {type === "category" ? "Category" : "Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor={`label-${type}`}>Label</Label>
            <Input
              id={`label-${type}`}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={type === "category" ? "e.g. Health" : "e.g. Morning Run"}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`
                    w-7 h-7 rounded-full transition-all
                    ${color === c ? "ring-2 ring-offset-2 ring-offset-background ring-white scale-110" : "hover:scale-105"}
                  `}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!label.trim()}>
            Create {type === "category" ? "Category" : "Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
