import type { ClawCard } from "./messages";

/**
 * Streaming parser for the openclaw stdout grammar.
 *
 * Structured chunks use either `[CARD]…[/CARD]` or `[BEGIN CARD]…[END CARD]`
 * containing JSON that conforms to {@link ClawCard}. Plain text is everything
 * outside those blocks.
 */

export type Fragment =
  | { type: "text"; text: string }
  | { type: "card"; card: ClawCard }
  | { type: "card-error"; raw: string; message: string };

const CARD_VARIANTS = [
  { open: "[CARD]", close: "[/CARD]" },
  { open: "[BEGIN CARD]", close: "[END CARD]" },
] as const;

const MAX_OPEN_LEN = Math.max(
  ...CARD_VARIANTS.map((v) => v.open.length),
);

interface ParserState {
  feed(chunk: string): Fragment[];
  flush(): Fragment[];
}

function tryParseCard(raw: string): Fragment {
  const trimmed = raw.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { kind?: unknown }).kind === "string"
    ) {
      return { type: "card", card: parsed as ClawCard };
    }
    return {
      type: "card-error",
      raw: trimmed,
      message: "Card payload missing required `kind` field",
    };
  } catch (err) {
    return {
      type: "card-error",
      raw: trimmed,
      message: err instanceof Error ? err.message : "Invalid card JSON",
    };
  }
}

function findEarliestCardOpen(buffer: string):
  | { index: number; open: string; close: string }
  | null {
  let best: { index: number; open: string; close: string } | null = null;
  for (const v of CARD_VARIANTS) {
    const i = buffer.indexOf(v.open);
    if (i === -1) continue;
    if (!best || i < best.index) {
      best = { index: i, open: v.open, close: v.close };
    }
  }
  return best;
}

export function createCardParser(): ParserState {
  let buffer = "";
  let pendingClose: string | null = null;

  return {
    feed(chunk: string): Fragment[] {
      buffer += chunk;
      const out: Fragment[] = [];

      while (true) {
        if (pendingClose) {
          const closeIdx = buffer.indexOf(pendingClose);
          if (closeIdx === -1) {
            return out;
          }
          const cardBody = buffer.slice(0, closeIdx);
          buffer = buffer.slice(closeIdx + pendingClose.length);
          out.push(tryParseCard(cardBody));
          pendingClose = null;
          continue;
        }

        const next = findEarliestCardOpen(buffer);
        if (!next) {
          const safeLen = Math.max(0, buffer.length - (MAX_OPEN_LEN - 1));
          if (safeLen > 0) {
            out.push({ type: "text", text: buffer.slice(0, safeLen) });
            buffer = buffer.slice(safeLen);
          }
          return out;
        }

        if (next.index > 0) {
          out.push({ type: "text", text: buffer.slice(0, next.index) });
        }
        buffer = buffer.slice(next.index + next.open.length);
        pendingClose = next.close;
      }
    },

    flush(): Fragment[] {
      if (pendingClose) {
        const stray = buffer;
        buffer = "";
        pendingClose = null;
        return [
          {
            type: "card-error",
            raw: stray,
            message: "Unterminated card block (expected closing tag)",
          },
        ];
      }
      if (buffer.length === 0) return [];
      const text = buffer;
      buffer = "";
      return [{ type: "text", text }];
    },
  };
}
