import { NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { getSetting } from "@/lib/modules/settings/actions";
import { listWishlist, listUserSkills } from "@/lib/modules/dashboard/actions";
import { getAllPlans } from "@/lib/modules/plans/actions";
import { fetchOpenBB } from "@/lib/modules/finance/openbb-client";
import { getTodoSourceScene, getAllScenes } from "@/lib/modules/mind-map/actions";
import { parseMindMapTodos } from "@/lib/modules/todos/parse-mind-map";
import { toolRegistry } from "@/lib/core/tool-registry";
import { CLAW_ACCESS_MODULES } from "@/lib/modules/settings/defaults";

export interface ClawContext {
  modules: Record<string, unknown>;
  availableTools: { name: string; description: string }[];
}

function isModuleEnabled(mod: string): boolean {
  return getSetting(`claw_access_${mod}`) === "true";
}

async function gatherModuleContext(): Promise<Record<string, unknown>> {
  const ctx: Record<string, unknown> = {};

  for (const mod of CLAW_ACCESS_MODULES) {
    if (!isModuleEnabled(mod)) continue;

    switch (mod) {
      case "todos": {
        const scene = getTodoSourceScene();
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
          const news = await fetchOpenBB<{ results: Array<{ title: string; date: string; url: string }> }>(
            "news/world",
            { limit: "5" },
          );
          ctx.finance = {
            source: "OpenBB",
            recentNews: news.results?.slice(0, 5).map((a) => ({
              title: a.title,
              date: a.date,
            })) ?? [],
          };
        } catch {
          ctx.finance = { source: "OpenBB", status: "unavailable" };
        }
        break;
      }
      case "plans": {
        const plans = getAllPlans();
        ctx.plans = plans.map((p) => ({
          id: p.id,
          title: p.title,
          updatedAt: p.updatedAt,
        }));
        break;
      }
      case "wishlist": {
        ctx.wishlist = listWishlist();
        break;
      }
      case "mindmap": {
        const scenes = getAllScenes("mind");
        ctx.mindmap = scenes.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        break;
      }
      case "skills": {
        ctx.skills = listUserSkills();
        break;
      }
    }
  }

  return ctx;
}

export async function buildClawContext(): Promise<ClawContext> {
  const modules = await gatherModuleContext();
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
  try {
    const ctx = await buildClawContext();
    return NextResponse.json(ctx);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
