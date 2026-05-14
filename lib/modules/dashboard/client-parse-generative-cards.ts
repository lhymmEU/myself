/**
 * Client-safe helpers for generative dashboard payloads (parsed agent card JSON).
 * Used by the bento UI to summarize structured `presentation.blocks` without
 * importing server-only DB code.
 */
export function summarizeGenerativePayload(json: string | null | undefined): {
  cardCount: number;
  blockCount: number;
} {
  if (!json?.trim()) return { cardCount: 0, blockCount: 0 };
  try {
    const parsed = JSON.parse(json) as { cards?: unknown[] };
    const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
    let blockCount = 0;
    for (const c of cards) {
      if (!c || typeof c !== "object") continue;
      const p = (c as { presentation?: { blocks?: unknown[] } }).presentation;
      if (p && Array.isArray(p.blocks)) blockCount += p.blocks.length;
    }
    return { cardCount: cards.length, blockCount };
  } catch {
    return { cardCount: 0, blockCount: 0 };
  }
}
