import { nanoid } from "nanoid";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

export const DRAG_DATA_TYPE = "application/x-pm-entity";

export type EntityType = "user" | "feature" | "demand";

export interface DragEntityData {
  entityType: EntityType;
  label: string;
  subtitle: string;
  customColor?: string;
}

const ENTITY_COLORS = {
  user: { stroke: "#3b82f6", bg: "#1e3a5f" },
  feature: { stroke: "#22c55e", bg: "#14532d" },
  demand: { stroke: "#f97316", bg: "#431407" },
} as const;

function hexToDarkBg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `#${Math.round(r * 0.3).toString(16).padStart(2, "0")}${Math.round(g * 0.3).toString(16).padStart(2, "0")}${Math.round(b * 0.3).toString(16).padStart(2, "0")}`;
}

function resolveColors(entityType: EntityType, customColor?: string) {
  const stroke = customColor ?? ENTITY_COLORS[entityType].stroke;
  const bg = customColor ? hexToDarkBg(customColor) : ENTITY_COLORS[entityType].bg;
  return { stroke, bg };
}

function buildElements(
  entityType: EntityType,
  label: string,
  subtitle: string,
  canvasX: number,
  canvasY: number,
  customColor?: string
) {
  const { stroke, bg } = resolveColors(entityType, customColor);
  const badgeMap: Record<EntityType, string> = {
    user: "USER",
    feature: "FEATURE",
    demand: "DEMAND",
  };

  const displayText = `[${badgeMap[entityType]}]\n${label}${subtitle ? `\n${subtitle}` : ""}`;

  const rectId = nanoid();
  const textId = nanoid();
  const width = 220;
  const height = 80;

  const rect = {
    id: rectId,
    type: "rectangle" as const,
    x: canvasX - width / 2,
    y: canvasY - height / 2,
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
    x: canvasX - width / 2,
    y: canvasY - height / 2,
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

  return { rect, text };
}

function screenToCanvas(
  api: ExcalidrawImperativeAPI,
  screenX: number,
  screenY: number
) {
  const appState = api.getAppState();
  const { scrollX, scrollY, zoom } = appState;
  const zoomValue = typeof zoom === "object" ? zoom.value : zoom;
  const canvasX = (screenX - scrollX) / zoomValue;
  const canvasY = (screenY - scrollY) / zoomValue;
  return { canvasX, canvasY };
}

export function placeEntityOnCanvas(
  api: ExcalidrawImperativeAPI,
  entityType: EntityType,
  label: string,
  subtitle: string,
  customColor?: string
) {
  const { canvasX, canvasY } = screenToCanvas(
    api,
    window.innerWidth / 2,
    window.innerHeight / 2
  );
  const { rect, text } = buildElements(
    entityType,
    label,
    subtitle,
    canvasX,
    canvasY,
    customColor
  );
  const currentElements = api.getSceneElements();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.updateScene({ elements: [...currentElements, rect as any, text as any] });
}

export function placeEntityAtPosition(
  api: ExcalidrawImperativeAPI,
  entityType: EntityType,
  label: string,
  subtitle: string,
  screenX: number,
  screenY: number,
  canvasContainerEl: HTMLElement,
  customColor?: string
) {
  const containerRect = canvasContainerEl.getBoundingClientRect();
  const relX = screenX - containerRect.left;
  const relY = screenY - containerRect.top;
  const { canvasX, canvasY } = screenToCanvas(api, relX, relY);
  const { rect, text } = buildElements(
    entityType,
    label,
    subtitle,
    canvasX,
    canvasY,
    customColor
  );
  const currentElements = api.getSceneElements();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api.updateScene({ elements: [...currentElements, rect as any, text as any] });
}
