"use client";

import dynamic from "next/dynamic";

const ExcalidrawCanvas = dynamic(
  () =>
    import("./excalidraw-canvas").then((mod) => ({
      default: mod.ExcalidrawCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <p className="text-sm">Loading mind map...</p>
        </div>
      </div>
    ),
  }
);

export function MindMapCanvas() {
  return (
    <div className="h-full w-full">
      <ExcalidrawCanvas />
    </div>
  );
}
