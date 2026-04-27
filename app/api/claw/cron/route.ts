import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/core/route-helpers";
import {
  executeOpenClawCommand,
  executeCommand,
  isSSHConnected,
} from "@/lib/modules/claw/actions";

interface OpenClawCronJob {
  jobId?: string;
  id?: string;
  name?: string;
  schedule?: {
    kind?: string;
    expr?: string;
    cron?: string;
    at?: string;
    everyMs?: number;
    tz?: string;
  };
  payload?: {
    kind?: string;
    message?: string;
    text?: string;
  };
  sessionTarget?: string;
  enabled?: boolean;
  disabled?: boolean;
  lastRun?: string;
  nextRun?: string;
}

function normalizeJob(raw: OpenClawCronJob) {
  const id = raw.jobId ?? raw.id ?? "";
  const schedule = raw.schedule;

  let expression = "";
  if (schedule?.expr) expression = schedule.expr;
  else if (schedule?.cron) expression = schedule.cron;
  else if (schedule?.kind === "at" && schedule.at) expression = `at ${schedule.at}`;
  else if (schedule?.kind === "every" && schedule.everyMs)
    expression = `every ${Math.round(schedule.everyMs / 1000)}s`;

  const command =
    raw.payload?.message ?? raw.payload?.text ?? "";

  const enabled =
    raw.enabled !== undefined ? raw.enabled : raw.disabled !== undefined ? !raw.disabled : true;

  return {
    id,
    name: raw.name ?? id,
    expression,
    command,
    sessionTarget: raw.sessionTarget ?? "main",
    enabled,
    scheduleKind: schedule?.kind ?? "cron",
    timezone: schedule?.tz ?? null,
    lastRun: raw.lastRun ?? null,
    nextRun: raw.nextRun ?? null,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const connectionId = req.nextUrl.searchParams.get("connectionId");
    if (!connectionId || !isSSHConnected(connectionId)) {
      return NextResponse.json({ jobs: [] });
    }

    const result = await executeOpenClawCommand(
      connectionId,
      "cron list --json",
      15000
    );

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `cron list failed (exit ${result.code}): ${(result.stderr || result.stdout).slice(0, 300)}` },
        { status: 502 }
      );
    }

    const raw = result.stdout.trim();
    if (!raw) {
      return NextResponse.json({ jobs: [] });
    }

    let parsed: OpenClawCronJob[];
    try {
      const data = JSON.parse(raw);
      parsed = Array.isArray(data) ? data : data.jobs ?? data.crons ?? [];
    } catch {
      return NextResponse.json({ jobs: [], parseError: "Failed to parse cron list JSON" });
    }

    const jobs = parsed.map(normalizeJob);
    return NextResponse.json({ jobs });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list cron jobs" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireUserId();
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const { connectionId, name, expression, command, sessionTarget, enabled, timezone, channel, deliveryTo } = body;

    if (!connectionId || !isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }
    if (!name || !expression || !command) {
      return NextResponse.json(
        { error: "name, expression, and command are required" },
        { status: 400 }
      );
    }

    const b64Msg = Buffer.from(command).toString("base64");
    const session = sessionTarget || "isolated";
    const escapedName = name.replace(/"/g, '\\"');

    let scheduleFlag: string;
    if (expression.startsWith("at ")) {
      scheduleFlag = `--at "${expression.slice(3)}"`;
    } else {
      scheduleFlag = `--cron "${expression}"`;
    }

    let cmd = `MSG=$(echo ${b64Msg} | base64 -d) && openclaw cron add --name "${escapedName}" ${scheduleFlag} --session ${session} --message "$MSG"`;

    if (timezone) {
      cmd += ` --tz "${timezone}"`;
    }
    if (enabled === false) {
      cmd += " --disabled";
    }
    if (channel) {
      cmd += ` --channel "${channel.replace(/"/g, '\\"')}"`;
    }
    if (deliveryTo) {
      cmd += ` --delivery-to "${deliveryTo.replace(/"/g, '\\"')}"`;
    }

    const result = await executeCommand(connectionId, cmd, 15000);

    if (result.code !== 0) {
      return NextResponse.json(
        { error: `cron add failed: ${(result.stderr || result.stdout).slice(0, 300)}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, output: result.stdout.trim() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create cron job" },
      { status: 500 }
    );
  }
}
