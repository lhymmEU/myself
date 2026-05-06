import type { UIMessage } from "ai";

/**
 * Card kinds the openclaw agent can render. These are intentionally
 * simple — anything more elaborate should compose multiple cards or fall
 * back to plain text.
 */
export type ClawCard =
  | {
      kind: "key-value";
      title?: string;
      items: Array<{ key: string; value: string }>;
    }
  | { kind: "list"; title?: string; items: string[] }
  | { kind: "code"; language?: string; code: string }
  | { kind: "alert"; level: "info" | "warn" | "error"; message: string }
  | { kind: "suggestions"; prompts: string[] };

/**
 * Custom data parts emitted by the chat route. Anything streamed as plain
 * text uses the AI SDK's built-in `text-*` chunks instead.
 */
export type ClawDataParts = {
  card: ClawCard;
  error: { message: string; detail?: string };
};

export interface ClawMessageMetadata {
  connectionId?: string;
}

export type ClawUIMessage = UIMessage<ClawMessageMetadata, ClawDataParts>;
