import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeCommand,
  isSSHConnected,
  getDefaultConnection,
  resolveAgentId,
} from "@/lib/modules/claw/actions";

const SKILL_PROMPT_PREFIX = `Generate a complete SKILL.md file based on the user's description below.

Requirements:
- Start with YAML frontmatter delimited by --- containing exactly "name" (kebab-case) and "description" (1-3 sentences explaining what the skill does and when to trigger it)
- Follow with a Markdown body using imperative form, including sections: "# <Skill Name>", "## About", "## When to Use", "## Workflow"
- Output ONLY the raw SKILL.md content. No explanations, no markdown fences wrapping it.

User's skill description:
`;

function parseFrontmatter(raw: string) {
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return { name: "", description: "", body: raw.trim() };

  const fm = fmMatch[1];
  const body = raw.slice(fmMatch[0].length).replace(/^\n+/, "");
  const nameMatch = fm.match(/^name:\s*(.+)$/m);
  const descMatch = fm.match(/^description:\s*(.+)$/m);

  return {
    name: nameMatch?.[1]?.trim() ?? "",
    description: descMatch?.[1]?.trim() ?? "",
    body,
  };
}

export async function POST(req: NextRequest) {
  bootApp();
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const connectionId =
      body.connectionId ??
      (await getDefaultConnection(auth.userId))?.id ??
      null;
    if (!connectionId) {
      return NextResponse.json(
        { error: "No connection configured" },
        { status: 400 }
      );
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json(
        { error: "Not connected via SSH" },
        { status: 400 }
      );
    }

    const { prompt } = body;
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const agentId = await resolveAgentId(connectionId);
    if (!agentId) {
      return NextResponse.json(
        {
          error:
            "Could not find an agent on the connected server. Make sure at least one agent session exists.",
        },
        { status: 400 }
      );
    }

    const fullPrompt = SKILL_PROMPT_PREFIX + prompt;
    const b64 = Buffer.from(fullPrompt).toString("base64");

    const cmd = `MSG=$(echo ${b64} | base64 -d) && openclaw agent --message "$MSG" --json --timeout 120 --agent ${agentId}`;

    const result = await executeCommand(connectionId, cmd, 130000);

    if (result.code !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      return NextResponse.json(
        {
          error: `openclaw agent failed (exit ${result.code}): ${detail.slice(0, 500)}`,
        },
        { status: 502 }
      );
    }

    const raw = result.stdout.trim();
    if (!raw) {
      return NextResponse.json(
        { error: "Empty response from agent" },
        { status: 502 }
      );
    }

    // Extract the agent's text response from the JSON output
    let agentText = raw;
    try {
      const parsed = JSON.parse(raw);
      agentText =
        parsed.result?.payloads?.[0]?.text ??
        parsed.response ??
        parsed.content ??
        parsed.text ??
        parsed.message ??
        parsed.choices?.[0]?.message?.content ??
        parsed.output ??
        raw;
    } catch {
      // Not JSON — use raw text directly
    }

    // Strip markdown fences if the agent wrapped the SKILL.md in them
    agentText = agentText
      .replace(/^```(?:markdown|md|yaml)?\s*\n/i, "")
      .replace(/\n```\s*$/, "")
      .trim();

    const skill = parseFrontmatter(agentText);

    if (!skill.name && !skill.body) {
      return NextResponse.json(
        {
          error: `Could not parse SKILL.md from agent response: ${agentText.slice(0, 500)}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      name: skill.name,
      description: skill.description,
      body: skill.body,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
