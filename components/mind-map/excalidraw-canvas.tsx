"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw, THEME } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import type { MindMapScene } from "@/lib/modules/mind-map/types";
import { useT } from "@/lib/i18n/context";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const SAVE_DEBOUNCE_MS = 1500;

const PERSISTED_APP_STATE_KEYS = [
  "viewBackgroundColor",
  "gridSize",
  "gridStep",
  "gridModeEnabled",
  "zenModeEnabled",
  "scrollX",
  "scrollY",
  "zoom",
] as const;

function pickAppState(
  state: AppState
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  const stateRecord = state as unknown as Record<string, unknown>;
  for (const key of PERSISTED_APP_STATE_KEYS) {
    if (key in stateRecord) {
      picked[key] = stateRecord[key];
    }
  }
  return picked;
}

interface ExcalidrawCanvasProps {
  sceneId: string;
  onBack: () => void;
}

export function ExcalidrawCanvas({ sceneId, onBack }: ExcalidrawCanvasProps) {
  const t = useT();
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sceneName, setSceneName] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mind-map?id=${sceneId}`);
        const scene: MindMapScene = await res.json();
        setSceneName(scene.name);

        let elements: ExcalidrawElement[] = [];
        let appState: Partial<AppState> = {};
        let files: BinaryFiles = {};

        try {
          elements = JSON.parse(scene.elements);
        } catch { /* empty scene */ }
        try {
          appState = JSON.parse(scene.appState);
        } catch { /* default state */ }
        try {
          files = JSON.parse(scene.files);
        } catch { /* no files */ }

        setInitialData({ elements, appState, files });
      } catch (err) {
        console.error("Failed to load mind map scene:", err);
        setInitialData({ elements: [], appState: {}, files: {} });
      } finally {
        setLoading(false);
      }
    }
    load();

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sceneId]);

  const saveScene = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const nonDeleted = elements.filter((el) => !el.isDeleted);
        fetch("/api/mind-map", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: sceneId,
            elements: JSON.stringify(nonDeleted),
            appState: JSON.stringify(pickAppState(appState)),
            files: JSON.stringify(files),
          }),
        }).catch((err) => console.error("Failed to save scene:", err));
      }, SAVE_DEBOUNCE_MS);
    },
    [sceneId]
  );

  const handleChange = useCallback(
    (
      elements: readonly ExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles
    ) => {
      saveScene(elements, appState, files);
    },
    [saveScene]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-background text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 mx-auto border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <p className="text-sm">{t("mindMap.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-background shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("mindMap.grid.back")}
        </Button>
        <span className="text-sm text-muted-foreground truncate">
          {sceneName}
        </span>
      </div>
      <div className="flex-1 min-h-0">
      <Excalidraw
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        initialData={
          initialData
            ? {
                elements: initialData.elements as ExcalidrawElement[],
                appState: {
                  ...initialData.appState,
                  theme: THEME.DARK,
                },
                files: initialData.files,
              }
            : undefined
        }
        onChange={handleChange}
        theme={THEME.DARK}
        name={sceneName || t("mindMap.name")}
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
      </div>
    </div>
  );
}
