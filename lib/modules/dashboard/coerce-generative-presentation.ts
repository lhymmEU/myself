import type { GenerativePresentation, GenerativeBlock } from "./insights-types";

function isBlock(x: unknown): x is GenerativeBlock {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const t = o.t;
  if (t === "heading" || t === "paragraph") {
    return typeof o.text === "string";
  }
  if (t === "bullets") {
    return Array.isArray(o.items) && o.items.every((i) => typeof i === "string");
  }
  if (t === "callout") {
    const tone = o.tone;
    return (
      (tone === "info" || tone === "warn" || tone === "success") &&
      typeof o.text === "string"
    );
  }
  if (t === "metric") {
    return typeof o.label === "string" && typeof o.value === "string";
  }
  return false;
}

export function coerceGenerativePresentation(
  raw: unknown,
): GenerativePresentation | null {
  if (!raw || typeof raw !== "object") return null;
  const blocks = (raw as { blocks?: unknown }).blocks;
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const cleaned: GenerativeBlock[] = [];
  for (const b of blocks) {
    if (isBlock(b)) cleaned.push(b);
  }
  return cleaned.length > 0 ? { blocks: cleaned } : null;
}
