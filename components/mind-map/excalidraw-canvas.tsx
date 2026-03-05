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

export function ExcalidrawCanvas() {
  const [initialData, setInitialData] = useState<{
    elements: readonly ExcalidrawElement[];
    appState: Partial<AppState>;
    files: BinaryFiles;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const sceneIdRef = useRef<string>("default");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/mind-map");
        const scene: MindMapScene = await res.json();
        sceneIdRef.current = scene.id;

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
  }, []);

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
            id: sceneIdRef.current,
            elements: JSON.stringify(nonDeleted),
            appState: JSON.stringify(pickAppState(appState)),
            files: JSON.stringify(files),
          }),
        }).catch((err) => console.error("Failed to save scene:", err));
      }, SAVE_DEBOUNCE_MS);
    },
    []
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
          <p className="text-sm">Loading mind map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
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
        name="Mind Map"
        UIOptions={{
          canvasActions: {
            loadScene: false,
          },
        }}
      />
    </div>
  );
}
