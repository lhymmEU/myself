import { NextRequest } from "next/server";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { z } from "zod";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  getClawConnection,
  getDefaultClawConnection,
} from "@/lib/claw/db";
import { streamCommand } from "@/lib/claw/ssh";
import { createCardParser } from "@/lib/claw/parser";
import { createStdoutNoiseFilter } from "@/lib/claw/filter-plugin-noise";
import type { ClawUIMessage } from "@/lib/claw/messages";
import { BOOTSTRAP_PREAMBLE } from "@/lib/claw/bootstrap-preamble";
import {
  WIKI_PREAMBLE,
  formatWikiIngestSupabaseCredentialBlock,
} from "@/lib/claw/wiki-preamble";
import { buildOpenclawAgentCommand } from "@/lib/claw/openclaw-agent";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { getOpenclawRefreshTokenPlain } from "@/lib/modules/dashboard/openclaw-token-actions";

const partSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["system", "user", "assistant"]),
  parts: z.array(partSchema).optional(),
  // legacy `content` field — older AI SDK clients sent this
  content: z.string().optional(),
});

const bodySchema = z.object({
  messages: z.array(messageSchema),
  connectionId: z.string().optional(),
  sessionId: z.string().optional(),
  bootstrap: z.boolean().optional(),
  /** When wiki preamble is on: prefer passing the browser session access JWT (multi-script safe). */
  supabaseAccessToken: z.string().optional(),
  /**
   * When true, prepend the wiki-maintainer preamble instead of (or in
   * addition to) the standard chat preamble. Used by the bento dashboard
   * to flip openclaw into wiki-maintainer mode for one shot.
   */
  wikiPreamble: z.boolean().optional(),
});

function lastUserText(
  messages: z.infer<typeof messageSchema>[],
): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    if (msg.parts && msg.parts.length > 0) {
      const text = msg.parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text!)
        .join("\n")
        .trim();
      if (text) return text;
    }
    if (typeof msg.content === "string" && msg.content.trim()) {
      return msg.content.trim();
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Validation failed",
        issues: parsed.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const userText = lastUserText(parsed.data.messages);
  if (!userText) {
    return new Response(JSON.stringify({ error: "No user message" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const connection = parsed.data.connectionId
    ? await getClawConnection(parsed.data.connectionId, auth.userId)
    : await getDefaultClawConnection(auth.userId);
  if (!connection) {
    return new Response(
      JSON.stringify({ error: "No claw connection configured" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const parts: string[] = [];
  if (parsed.data.wikiPreamble === true) {
    const access = parsed.data.supabaseAccessToken?.trim();
    const refresh = access
      ? null
      : await getOpenclawRefreshTokenPlain(auth.userId);
    if (!access && !refresh) {
      return new Response(
        JSON.stringify({
          error:
            "Save your Supabase refresh token under Dashboard → Settings → OpenClaw / wiki ingest, or send supabaseAccessToken from the signed-in browser for wiki maintainer chat.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const cred = formatWikiIngestSupabaseCredentialBlock({
      supabaseUrl: getSupabaseUrl(),
      supabaseAnonKey: getSupabaseAnonKey(),
      accessToken: access ?? null,
      refreshToken: refresh,
    });
    parts.push(`${WIKI_PREAMBLE}\n\n${cred}`);
  }
  if (parsed.data.bootstrap === true) {
    parts.push(BOOTSTRAP_PREAMBLE);
  }
  const sendText =
    parts.length > 0 ? `${parts.join("\n\n")}\n\n${userText}` : userText;
  const command = buildOpenclawAgentCommand({
    message: sendText,
    sessionId: parsed.data.sessionId,
    agentTimeoutSec: 120,
  });

  const stream = createUIMessageStream<ClawUIMessage>({
    async execute({ writer }) {
      const textId = crypto.randomUUID();
      let textOpen = false;
      const ensureTextOpen = () => {
        if (textOpen) return;
        writer.write({ type: "text-start", id: textId });
        textOpen = true;
      };
      const closeText = () => {
        if (!textOpen) return;
        writer.write({ type: "text-end", id: textId });
        textOpen = false;
      };

      const parser = createCardParser();
      const noiseFilter = createStdoutNoiseFilter();

      try {
        const iter = streamCommand(connection.id, command, 120_000, auth.userId);
        // Manually iterate so we can also catch the return value of the
        // generator (the final ExecResult) for non-zero exit codes.
        let result = await iter.next();
        while (!result.done) {
          const filtered = noiseFilter.push(result.value);
          const chunk =
            filtered +
            // Important when stdout ends without a newline before flush().
            "";
          for (const fragment of parser.feed(chunk)) {
            if (fragment.type === "text") {
              ensureTextOpen();
              writer.write({
                type: "text-delta",
                id: textId,
                delta: fragment.text,
              });
            } else if (fragment.type === "card") {
              closeText();
              writer.write({
                type: "data-card",
                data: fragment.card,
              });
            } else {
              closeText();
              writer.write({
                type: "data-error",
                data: {
                  message: "Failed to parse card payload",
                  detail: `${fragment.message}: ${fragment.raw}`,
                },
              });
            }
          }
          result = await iter.next();
        }

        const noiseTail = noiseFilter.flush();
        if (noiseTail) {
          for (const fragment of parser.feed(noiseTail)) {
            if (fragment.type === "text") {
              ensureTextOpen();
              writer.write({
                type: "text-delta",
                id: textId,
                delta: fragment.text,
              });
            } else if (fragment.type === "card") {
              closeText();
              writer.write({
                type: "data-card",
                data: fragment.card,
              });
            } else {
              closeText();
              writer.write({
                type: "data-error",
                data: {
                  message: "Failed to parse card payload",
                  detail: `${fragment.message}: ${fragment.raw}`,
                },
              });
            }
          }
        }

        for (const fragment of parser.flush()) {
          if (fragment.type === "text") {
            ensureTextOpen();
            writer.write({
              type: "text-delta",
              id: textId,
              delta: fragment.text,
            });
          } else if (fragment.type === "card") {
            closeText();
            writer.write({ type: "data-card", data: fragment.card });
          } else {
            closeText();
            writer.write({
              type: "data-error",
              data: {
                message: "Failed to parse card payload",
                detail: `${fragment.message}: ${fragment.raw}`,
              },
            });
          }
        }

        closeText();

        const exec = result.value;
        if (exec && exec.code !== 0) {
          writer.write({
            type: "data-error",
            data: {
              message: `openclaw exited with code ${exec.code}`,
              detail: exec.stderr || undefined,
            },
          });
        }
      } catch (err) {
        closeText();
        writer.write({
          type: "data-error",
          data: {
            message:
              err instanceof Error
                ? err.message
                : "Unknown error running openclaw",
          },
        });
      }
    },
    onError(err) {
      return err instanceof Error ? err.message : "Stream error";
    },
  });

  return createUIMessageStreamResponse({ stream });
}
