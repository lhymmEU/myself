import { spawn } from "node:child_process";
import { createClient, type RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import { readConfig } from "./config";
import { skillTargetPath } from "./skill-installer";

const HEARTBEAT_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 2_000;

interface AgentEventRow {
  id: string;
  user_id: string;
  event_type: string;
  status: string;
  created_at: number;
}

export async function runStart(): Promise<void> {
  const config = await readConfig();
  const supabase = createClient(config.supabaseUrl, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${config.token}` } },
  });

  // Validate the token + fetch label for the friendly banner.
  const { data: reg, error } = await supabase
    .from("agent_registrations")
    .select("label")
    .eq("user_id", config.userId)
    .single();
  if (error) {
    console.error(`[start] token validation failed: ${error.message}`);
    process.exit(1);
  }
  const label = reg?.label || "(no label)";
  const skillDir = skillTargetPath();

  console.log("");
  console.log(`myself-op watcher`);
  console.log(`  user:  ${config.userId}`);
  console.log(`  label: ${label}`);
  console.log(`  skill: ${skillDir}`);
  console.log(`  agent: ${agentCommand(config.agentCmd)}`);
  console.log("");

  let pendingTimer: NodeJS.Timeout | null = null;
  let agentInFlight = false;
  let rerunQueued = false;

  const scheduleRun = (reason: string) => {
    console.log(`[trigger] ${reason}`);
    if (agentInFlight) {
      rerunQueued = true;
      return;
    }
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(() => {
      pendingTimer = null;
      runAgent();
    }, DEBOUNCE_MS);
  };

  const runAgent = () => {
    agentInFlight = true;
    const cmd = agentCommand(config.agentCmd);
    const args = [
      "agent",
      "--message",
      "Process all pending events in the agent_events queue using the myself-op skill. " +
        "Mark each event as done when complete.",
    ];
    console.log(`[agent] invoking: ${cmd} ${args.map(quote).join(" ")}`);
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      agentInFlight = false;
      if (code !== 0) {
        console.warn(`[agent] exited with code ${code}`);
      }
      if (rerunQueued) {
        rerunQueued = false;
        scheduleRun("flush queued events");
      }
    });
    child.on("error", (err) => {
      agentInFlight = false;
      console.error(`[agent] could not start: ${err.message}`);
    });
  };

  // 1. Sweep the queue once on startup so events that landed while we were
  //    offline get processed.
  const { count } = await supabase
    .from("agent_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", config.userId)
    .eq("status", "pending");
  if ((count ?? 0) > 0) {
    scheduleRun(`startup sweep: ${count} pending events`);
  } else {
    console.log("[start] queue is empty");
  }

  // 2. Subscribe to Realtime for incremental updates.
  const channel = supabase
    .channel(`agent_events:${config.userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "agent_events",
        filter: `user_id=eq.${config.userId}`,
      },
      (payload: RealtimePostgresInsertPayload<AgentEventRow>) => {
        scheduleRun(`new event ${payload.new.event_type} (${payload.new.id.slice(0, 8)})`);
      },
    )
    .subscribe((status) => {
      console.log(`[realtime] ${status}`);
    });

  // 3. Periodic heartbeat → updates last_seen_at so the dashboard shows
  //    "Last seen just now" while we're alive.
  const heartbeat = setInterval(async () => {
    const { error: hbErr } = await supabase
      .from("agent_registrations")
      .update({ last_seen_at: Date.now() })
      .eq("user_id", config.userId);
    if (hbErr) {
      console.warn(`[heartbeat] ${hbErr.message}`);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Initial heartbeat
  await supabase
    .from("agent_registrations")
    .update({ last_seen_at: Date.now() })
    .eq("user_id", config.userId);

  console.log("[start] watcher running. Ctrl-C to stop.");

  process.on("SIGINT", async () => {
    console.log("\n[shutdown] stopping...");
    clearInterval(heartbeat);
    await channel.unsubscribe();
    process.exit(0);
  });
}

function agentCommand(override?: string): string {
  return override ?? process.env.MYSELF_AGENT_CMD ?? "openclaw";
}

function quote(s: string): string {
  return /[^\w\-.,@/=:]/.test(s) ? JSON.stringify(s) : s;
}
