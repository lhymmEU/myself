"use client";

import { PenTool } from "lucide-react";

export function MindMapPreview() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
      <div className="text-center space-y-2">
        <PenTool className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm">Click to open your canvas</p>
        <p className="text-xs opacity-60">
          Draw, sketch, and organize ideas freely
        </p>
      </div>
    </div>
  );
}
