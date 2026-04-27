import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import { executeToolCall, executeToolCalls } from "@/lib/agent/executor";
import { toOpenAIFunctions, toMCPTools } from "@/lib/agent/adapter";
import { toolRegistry } from "@/lib/core/tool-registry";

bootApp();

export async function GET(request: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  if (format === "mcp") {
    return NextResponse.json({ tools: toMCPTools() });
  }

  return NextResponse.json({
    tools: toOpenAIFunctions(),
    availableTools: toolRegistry.listNames(),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json();

    if (Array.isArray(body.calls)) {
      const results = await executeToolCalls(body.calls);
      return NextResponse.json({ results });
    }

    if (body.name && body.arguments !== undefined) {
      const result = await executeToolCall({
        name: body.name,
        arguments: body.arguments,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Expected { name, arguments } or { calls: [...] }" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
