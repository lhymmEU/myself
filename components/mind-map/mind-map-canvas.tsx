"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useT } from "@/lib/i18n/context";
import { CanvasGrid } from "./canvas-grid";

const ExcalidrawCanvas = dynamic(
  () =>
    import("./excalidraw-canvas").then((mod) => ({
      default: mod.ExcalidrawCanvas,
    })),
  {
    ssr: false,
    loading: () => <MindMapLoading />,
  }
);

function MindMapLoading() {
  const t = useT();
  return (
    <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 mx-auto border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        <p className="text-sm">{t("mindMap.loading")}</p>
      </div>
    </div>
  );
}

export function MindMapCanvas() {
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

  if (activeSceneId) {
    return (
      <div className="h-full w-full">
        <ExcalidrawCanvas
          sceneId={activeSceneId}
          onBack={() => setActiveSceneId(null)}
        />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <CanvasGrid onOpen={(id) => setActiveSceneId(id)} />
    </div>
  );
}
