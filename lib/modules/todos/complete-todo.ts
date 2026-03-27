interface ExcalidrawEl {
  id: string;
  type: string;
  containerId?: string | null;
  startBinding?: { elementId: string } | null;
  endBinding?: { elementId: string } | null;
}

/**
 * Removes a todo's rectangle, its inner text, and any arrows
 * connecting it from the default mind map scene.
 */
export async function completeTodo(todoId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/mind-map?todoSource=true");
    if (!res.ok) return false;
    const scene = await res.json();

    let elements: ExcalidrawEl[] = [];
    try {
      elements = JSON.parse(scene.elements);
    } catch {
      return false;
    }

    const removeIds = new Set<string>();
    removeIds.add(todoId);

    for (const el of elements) {
      if (el.type === "text" && el.containerId === todoId) {
        removeIds.add(el.id);
      }
      if (el.type === "arrow") {
        if (
          el.startBinding?.elementId === todoId ||
          el.endBinding?.elementId === todoId
        ) {
          removeIds.add(el.id);
        }
      }
    }

    const filtered = elements.filter((el) => !removeIds.has(el.id));

    const saveRes = await fetch("/api/mind-map", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: scene.id,
        elements: JSON.stringify(filtered),
      }),
    });

    return saveRes.ok;
  } catch {
    return false;
  }
}
