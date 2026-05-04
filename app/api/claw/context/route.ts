import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { getSetting } from "@/lib/modules/settings/actions";
import { listWishlist, listUserSkills } from "@/lib/modules/dashboard/actions";
import { getAllPlans } from "@/lib/modules/plans/actions";
import { fetchOpenBB } from "@/lib/modules/finance/openbb-client";
import { getTodoSourceScene, getAllScenes } from "@/lib/modules/mind-map/actions";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import {
  listCollections as listMarkedCollections,
  listItems as listMarkedItems,
} from "@/lib/modules/marked/actions";
import { toolRegistry } from "@/lib/core/tool-registry";
import { CLAW_ACCESS_MODULES } from "@/lib/modules/settings/defaults";

export interface ClawContext {
  modules: Record<string, unknown>;
  availableTools: { name: string; description: string }[];
}

async function isModuleEnabled(mod: string, userId: string): Promise<boolean> {
  return (await getSetting(`claw_access_${mod}`, userId)) === "true";
}

async function gatherModuleContext(
  userId: string,
): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {};

  for (const mod of CLAW_ACCESS_MODULES) {
    if (!(await isModuleEnabled(mod, userId))) continue;

    switch (mod) {
      case "todos": {
        const scene = await getTodoSourceScene(userId);
        if (scene) {
          let elements: unknown[] = [];
          try {
            elements = JSON.parse(scene.elements);
          } catch {
            /* empty */
          }
          const todos = parseMindMapTodos(
            elements as Parameters<typeof parseMindMapTodos>[0],
          );
          ctx.todos = todos.map((t) => ({
            id: t.id,
            title: t.title,
            isUrgent: t.isUrgent,
          }));
        } else {
          ctx.todos = [];
        }
        break;
      }
      case "finance": {
        try {
          const newsPromise = fetchOpenBB<{ results: Array<{ title: string; date: string; url: string }> }>(
            "news/world",
            { limit: "5" },
          ).catch(() => null);

          const ratesPromise = fetchOpenBB<{ results: Array<Record<string, number | string>> }>(
            "fixedincome/government/treasury_rates",
            { provider: "federal_reserve" },
          ).catch(() => null);

          const [news, rates] = await Promise.all([newsPromise, ratesPromise]);

          const latestRate = rates?.results?.length ? rates.results[rates.results.length - 1] : null;

          ctx.finance = {
            source: "OpenBB",
            recentNews: news?.results?.slice(0, 5).map((a) => ({
              title: a.title,
              date: a.date,
            })) ?? [],
            treasuryRates: latestRate ? {
              "1M": latestRate.month_1,
              "3M": latestRate.month_3,
              "1Y": latestRate.year_1,
              "10Y": latestRate.year_10,
              "30Y": latestRate.year_30,
            } : null,
          };
        } catch {
          ctx.finance = { source: "OpenBB", status: "unavailable" };
        }
        break;
      }
      case "plans": {
        const plans = await getAllPlans(userId);
        ctx.plans = plans.map((p) => ({
          id: p.id,
          title: p.title,
          updatedAt: p.updatedAt,
        }));
        break;
      }
      case "wishlist": {
        ctx.wishlist = await listWishlist(userId);
        break;
      }
      case "mindmap": {
        const scenes = await getAllScenes("mind", userId);
        ctx.mindmap = scenes.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        break;
      }
      case "skills": {
        ctx.skills = await listUserSkills(userId);
        break;
      }
      case "marked": {
        const [collections, items] = await Promise.all([
          listMarkedCollections(userId),
          listMarkedItems(null, userId),
        ]);
        const counts = new Map<string | null, number>();
        for (const item of items) {
          const key = item.collectionId ?? null;
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        ctx.marked = {
          collections: collections.map((c) => ({
            id: c.id,
            name: c.name,
            itemCount: counts.get(c.id) ?? 0,
          })),
          uncollectedCount: counts.get(null) ?? 0,
          totalItems: items.length,
        };
        break;
      }
    }
  }

  return ctx;
}

export async function buildClawContext(userId: string): Promise<ClawContext> {
  const modules = await gatherModuleContext(userId);
  const tools = toolRegistry.getAll().map((t) => ({
    name: t.name,
    description: t.description,
  }));
  return { modules, availableTools: tools };
}

export function formatContextForPrompt(ctx: ClawContext): string {
  const lines: string[] = ["[USER CONTEXT]"];

  for (const [mod, data] of Object.entries(ctx.modules)) {
    lines.push(`## ${mod}`);
    lines.push(JSON.stringify(data, null, 2));
  }

  if (ctx.availableTools.length > 0) {
    lines.push("\n## Available Local Tools");
    lines.push(
      "You can request the user's Life Dashboard to execute these tools on your behalf.",
    );
    lines.push(
      "To do so, include a JSON block in your response wrapped in [TOOL_CALL] and [/TOOL_CALL] markers.",
    );
    lines.push("Format: { \"name\": \"toolName\", \"arguments\": { ... } }");
    lines.push("You may include multiple tool call blocks. Each will require user approval.");
    lines.push("");
    for (const tool of ctx.availableTools) {
      lines.push(`- **${tool.name}**: ${tool.description}`);
    }
  }

  lines.push("[/USER CONTEXT]");
  return lines.join("\n");
}

export async function GET() {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const ctx = await buildClawContext(auth.userId);
    return NextResponse.json(ctx);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
