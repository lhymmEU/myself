"use client";

import { Brain, Plus } from "lucide-react";

export function MindMapPreview() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
      <div className="text-center space-y-2">
        <Brain className="h-12 w-12 mx-auto opacity-20" />
        <p className="text-sm">Click to open your mind map</p>
        <p className="text-xs opacity-60">
          Organize every aspect of your life visually
        </p>
      </div>
    </div>
  );
}
