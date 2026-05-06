import type { ClawCard } from "./messages";

/**
 * Streaming parser for the openclaw stdout grammar.
 *
 * The agent is taught (via the system prompt) to wrap any structured
 * output in `[CARD]…[/CARD]` blocks containing JSON that conforms to the
 * {@link ClawCard} discriminated union. Anything outside a `[CARD]` block
 * is plain text.
 *
 * Usage:
 *
 *     const parser = createCardParser();
 *     for await (const chunk of stream) {
 *       for (const fragment of parser.feed(chunk)) {
 *         // fragment is { type: "text", text } | { type: "card", card }
 *       }
 *     }
 *     for (const tail of parser.flush()) {
 *       // emit any trailing text
 *     }
 */

export type Fragment =
  | { type: "text"; text: string }
  | { type: "card"; card: ClawCard }
  | { type: "card-error"; raw: string; message: string };

const OPEN_TAG = "[CARD]";
const CLOSE_TAG = "[/CARD]";

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

export function createCardParser(): ParserState {
  // Buffer holds bytes we haven't yet been able to classify. We keep it
  // small by flushing as soon as we know a chunk can no longer match the
  // start of an OPEN_TAG.
  let buffer = "";
  let inCard = false;

  return {
    feed(chunk: string): Fragment[] {
      buffer += chunk;
      const out: Fragment[] = [];

      while (true) {
        if (inCard) {
          const close = buffer.indexOf(CLOSE_TAG);
          if (close === -1) {
            // Not enough yet — leave buffer intact, wait for more.
            return out;
          }
          const cardBody = buffer.slice(0, close);
          buffer = buffer.slice(close + CLOSE_TAG.length);
          out.push(tryParseCard(cardBody));
          inCard = false;
          continue;
        }

        const open = buffer.indexOf(OPEN_TAG);
        if (open === -1) {
          // Emit everything except a possible partial-tag tail so we
          // don't accidentally split "[CAR" across chunks.
          const safeLen = Math.max(0, buffer.length - (OPEN_TAG.length - 1));
          if (safeLen > 0) {
            out.push({ type: "text", text: buffer.slice(0, safeLen) });
            buffer = buffer.slice(safeLen);
          }
          return out;
        }

        if (open > 0) {
          out.push({ type: "text", text: buffer.slice(0, open) });
        }
        buffer = buffer.slice(open + OPEN_TAG.length);
        inCard = true;
      }
    },

    flush(): Fragment[] {
      if (inCard) {
        // Stream ended mid-card — surface what we have as an error so the
        // UI doesn't silently drop content.
        const stray = buffer;
        buffer = "";
        inCard = false;
        return [
          {
            type: "card-error",
            raw: stray,
            message: "Unterminated [CARD] block",
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
