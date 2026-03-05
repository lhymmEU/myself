import type { MindMapTodo } from "./types";

interface BoundElement {
  id: string;
  type: string;
}

interface Binding {
  elementId: string;
  focus: number;
  gap: number;
}

interface ExcalidrawEl {
  id: string;
  type: string;
  text?: string;
  containerId?: string | null;
  strokeColor?: string;
  backgroundColor?: string;
  boundElements?: BoundElement[] | null;
  startBinding?: Binding | null;
  endBinding?: Binding | null;
  isDeleted?: boolean;
}

type NodeKind = "todo" | "project" | "person";

interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  isUrgent: boolean;
  parentIds: string[];
}

const RED_HEX_VALUES = new Set([
  "#ffc9c9",
  "#ffa8a8",
  "#ff8787",
  "#ff6b6b",
  "#fa5252",
  "#f03e3e",
  "#e03131",
  "#c92a2a",
  "#a51111",
  "#ff0000",
  "#e00000",
]);

function isRedColor(hex: string | undefined): boolean {
  if (!hex) return false;
  const lower = hex.toLowerCase();
  if (RED_HEX_VALUES.has(lower)) return true;

  const match = lower.match(/^#([0-9a-f]{6})$/);
  if (!match) return false;
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  return r > 180 && g < 100 && b < 100;
}

function shapeTypeToKind(type: string): NodeKind | null {
  switch (type) {
    case "rectangle":
      return "todo";
    case "diamond":
      return "project";
    case "ellipse":
      return "person";
    default:
      return null;
  }
}

function buildTrace(
  nodeId: string,
  nodes: Map<string, GraphNode>,
  visited: Set<string> = new Set()
): string[][] {
  if (visited.has(nodeId)) return [[]];
  visited.add(nodeId);

  const node = nodes.get(nodeId);
  if (!node) return [[]];

  if (node.parentIds.length === 0) {
    return [[node.label]];
  }

  const traces: string[][] = [];
  for (const parentId of node.parentIds) {
    const parentTraces = buildTrace(parentId, nodes, new Set(visited));
    for (const pt of parentTraces) {
      traces.push([...pt, node.label]);
    }
  }
  return traces.length > 0 ? traces : [[node.label]];
}

export function parseMindMapTodos(elements: ExcalidrawEl[]): MindMapTodo[] {
  const active = elements.filter((el) => !el.isDeleted);

  const textByContainer = new Map<string, string>();
  for (const el of active) {
    if (el.type === "text" && el.containerId && el.text) {
      textByContainer.set(el.containerId, el.text);
    }
  }

  const nodes = new Map<string, GraphNode>();
  for (const el of active) {
    const kind = shapeTypeToKind(el.type);
    if (!kind) continue;

    const label = textByContainer.get(el.id) ?? "";
    if (!label) continue;

    nodes.set(el.id, {
      id: el.id,
      label,
      kind,
      isUrgent:
        kind === "todo" &&
        (isRedColor(el.strokeColor) || isRedColor(el.backgroundColor)),
      parentIds: [],
    });
  }

  for (const el of active) {
    if (el.type !== "arrow") continue;
    const startId = el.startBinding?.elementId;
    const endId = el.endBinding?.elementId;
    if (!startId || !endId) continue;
    if (!nodes.has(startId) || !nodes.has(endId)) continue;

    const child = nodes.get(endId)!;
    child.parentIds.push(startId);
  }

  const todos: MindMapTodo[] = [];
  for (const node of nodes.values()) {
    if (node.kind !== "todo") continue;

    const traces = buildTrace(node.id, nodes);
    const rooted = traces.find((t) => t[0] === "_magicsheep");
    if (!rooted) continue;

    const trace = rooted.filter((label) => label !== "_magicsheep");

    todos.push({
      id: node.id,
      title: node.label,
      isUrgent: node.isUrgent,
      trace,
    });
  }

  todos.sort((a, b) => {
    if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return todos;
}
