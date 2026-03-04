"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";

export interface LifeNodeData {
  label: string;
  type: "category" | "item";
  color: string;
  metadata: Record<string, unknown>;
  onEdit?: (id: string) => void;
  [key: string]: unknown;
}

function LifeNodeComponent({ id, data }: NodeProps) {
  const { label, type, color, onEdit } = data as unknown as LifeNodeData;
  const isCategory = type === "category";

  return (
    <div
      className={`
        group relative rounded-lg border border-border bg-card shadow-md
        transition-shadow hover:shadow-lg cursor-pointer
        ${isCategory ? "min-w-[180px] min-h-[80px]" : "min-w-[140px] min-h-[56px]"}
      `}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      onClick={() => onEdit?.(id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" id="left" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" id="right" />

      <div className={`flex flex-col gap-1 ${isCategory ? "p-4" : "p-3"}`}>
        <span className={`font-semibold text-foreground ${isCategory ? "text-sm" : "text-xs"}`}>
          {label}
        </span>
        <Badge variant="outline" className="text-[10px] w-fit px-1.5 py-0">
          {type}
        </Badge>
      </div>
    </div>
  );
}

export const LifeNode = memo(LifeNodeComponent);
