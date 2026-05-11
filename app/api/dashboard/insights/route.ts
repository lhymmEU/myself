import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  listActiveCards,
  getCard,
  recordVerb,
  pinQuery,
  unpinQuery,
  listPinnedQueries,
} from "@/lib/modules/dashboard/insights-actions";
import { readWikiPage } from "@/lib/modules/dashboard/wiki-vault";
import type { CardVerb } from "@/lib/modules/dashboard/insights-types";

const VERBS: readonly CardVerb[] = [
  "confirm",
  "contradict",
  "expand",
  "archive",
  "dismiss",
  "pin",
  "unpin",
] as const;

function isVerb(value: unknown): value is CardVerb {
  return typeof value === "string" && (VERBS as readonly string[]).includes(value);
}

/**
 * GET /api/dashboard/insights
 *   → returns the active card list and the user's pinned queries.
 * GET /api/dashboard/insights?cardId=… &include=wiki
 *   → returns one card plus the markdown of its backing wiki page (if any).
 */
export async function GET(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const cardId = req.nextUrl.searchParams.get("cardId");
  const include = req.nextUrl.searchParams.get("include");

  try {
    if (cardId) {
      const card = await getCard(cardId, userId);
      if (!card) {
        return NextResponse.json({ error: "Card not found" }, { status: 404 });
      }
      const result: Record<string, unknown> = { card };
      if (include === "wiki" && card.wikiSlug) {
        result.wiki = await readWikiPage(userId, card.wikiSlug);
      }
      return NextResponse.json(result);
    }

    const [cards, pinned] = await Promise.all([
      listActiveCards(userId),
      listPinnedQueries(userId),
    ]);
    return NextResponse.json({ cards, pinned });
  } catch (err) {
    console.error("[GET /api/dashboard/insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read cards" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/dashboard/insights — record a user verb on a card
 *   body: { cardId, verb, payload? }
 *
 * POST /api/dashboard/insights?action=pinQuery — pin a question
 *   body: { question, wikiSlug? }
 *
 * POST /api/dashboard/insights?action=unpinQuery
 *   body: { id }
 */
export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { userId } = auth;

  const action = req.nextUrl.searchParams.get("action");

  try {
    const body = await req.json();

    if (action === "pinQuery") {
      const { question, wikiSlug } = body as {
        question?: string;
        wikiSlug?: string | null;
      };
      if (!question || typeof question !== "string" || !question.trim()) {
        return NextResponse.json(
          { error: "Missing question" },
          { status: 400 },
        );
      }
      const result = await pinQuery(question.trim(), wikiSlug ?? null, userId);
      return NextResponse.json(result);
    }

    if (action === "unpinQuery") {
      const { id } = body as { id?: string };
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }
      await unpinQuery(id, userId);
      return NextResponse.json({ success: true });
    }

    // Default action: record a verb on a card.
    const { cardId, verb, payload } = body as {
      cardId?: string;
      verb?: string;
      payload?: Record<string, unknown> | null;
    };
    if (!cardId || !isVerb(verb)) {
      return NextResponse.json(
        { error: "Expected { cardId, verb }" },
        { status: 400 },
      );
    }
    const dismissal = await recordVerb(cardId, verb, payload ?? null, userId);
    return NextResponse.json(dismissal);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 },
    );
  }
}
