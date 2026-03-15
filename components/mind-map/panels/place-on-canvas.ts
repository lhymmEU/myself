import { nanoid } from "nanoid";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

const ENTITY_COLORS = {
  user: { stroke: "#3b82f6", bg: "#1e3a5f" },
  feature: { stroke: "#22c55e", bg: "#14532d" },
  demand: { stroke: "#f97316", bg: "#431407" },
} as const;

type EntityType = keyof typeof ENTITY_COLORS;

export function placeEntityOnCanvas(
  api: ExcalidrawImperativeAPI,
  entityType: EntityType,
  label: string,
  subtitle: string
) {
  const { stroke, bg } = ENTITY_COLORS[entityType];
  const badgeMap: Record<EntityType, string> = {
    user: "USER",
    feature: "FEATURE",
    demand: "DEMAND",
  };

  const displayText = `[${badgeMap[entityType]}]\n${label}${subtitle ? `\n${subtitle}` : ""}`;

  const appState = api.getAppState();
  const { scrollX, scrollY, zoom } = appState;
  const zoomValue = typeof zoom === "object" ? zoom.value : zoom;

  const centerX = (window.innerWidth / 2 - scrollX) / zoomValue;
  const centerY = (window.innerHeight / 2 - scrollY) / zoomValue;

  const rectId = nanoid();
  const textId = nanoid();
  const width = 220;
  const height = 80;

  const rect = {
    id: rectId,
    type: "rectangle" as const,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    strokeColor: stroke,
    backgroundColor: bg,
    fillStyle: "solid" as const,
    strokeWidth: 2,
    roundness: { type: 3 },
    boundElements: [{ type: "text" as const, id: textId }],
    isDeleted: false,
    angle: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: undefined,
    roughness: 1,
    seed: Math.floor(Math.random() * 2000000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2000000000),
    link: null,
    locked: false,
    updated: Date.now(),
  };

  const text = {
    id: textId,
    type: "text" as const,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    text: displayText,
    originalText: displayText,
    autoResize: true,
    fontSize: 14,
    fontFamily: 5,
    textAlign: "center" as const,
    verticalAlign: "middle" as const,
    strokeColor: "#ffffff",
    backgroundColor: "transparent",
    fillStyle: "solid" as const,
    strokeWidth: 1,
    roundness: null,
    containerId: rectId,
    boundElements: null,
    isDeleted: false,
    angle: 0,
    opacity: 100,
    groupIds: [],
    frameId: null,
    index: undefined,
    roughness: 1,
    seed: Math.floor(Math.random() * 2000000000),
    version: 1,
    versionNonce: Math.floor(Math.random() * 2000000000),
    link: null,
    locked: false,
    updated: Date.now(),
    lineHeight: 1.25,
  };

  const currentElements = api.getSceneElements();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.updateScene({ elements: [...currentElements, rect as any, text as any] });
}
