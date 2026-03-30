import { NextRequest, NextResponse } from "next/server";
import { bootApp } from "@/lib/core/init";
import {
  executeCommand,
  executeOpenClawCommand,
  isSSHConnected,
  getDefaultConnection,
} from "@/lib/modules/claw/actions";

/**
 * GET — list sessions enriched with token usage from sessions.json store files.
 *
 * 1. `openclaw sessions --all-agents --json` gives us agentId/key/model per session
 *    and the store paths.
 * 2. For each store we cat its sessions.json to pull inputTokens / outputTokens /
 *    totalTokens / contextTokens per entry.
 */
export async function GET(req: NextRequest) {
  bootApp();
  try {
    const cid = req.nextUrl.searchParams.get("connectionId");
    const connectionId = cid ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }

    const listRes = await executeOpenClawCommand(
      connectionId,
      "sessions --all-agents --json",
      15000
    );
    const raw = listRes.stdout || listRes.stderr || "";

    let parsed: Record<string, unknown> = {};
    try { parsed = JSON.parse(raw); } catch { /* keep empty */ }

    const sessions: Record<string, unknown>[] =
      (parsed.sessions as Record<string, unknown>[]) ?? [];
    const stores: { agentId: string; path: string }[] =
      (parsed.stores as { agentId: string; path: string }[]) ?? [];

    const tokenMap = new Map<string, Record<string, unknown>>();

    for (const store of stores) {
      const safePath = store.path.replace(/['"\\$`!]/g, "");
      try {
        const catRes = await executeCommand(
          connectionId,
          `cat "${safePath}" 2>/dev/null || echo '{}'`,
          10000
        );
        const storeData = JSON.parse(catRes.stdout || "{}");

        const entries: Record<string, Record<string, unknown>> =
          (storeData.sessions ?? storeData.entries ?? storeData) as Record<string, Record<string, unknown>>;

        if (entries && typeof entries === "object") {
          for (const [entryKey, entry] of Object.entries(entries)) {
            if (entry && typeof entry === "object") {
              tokenMap.set(entryKey, entry);
            }
          }
        }
      } catch {
        // store file unreadable — skip
      }
    }

    const enriched = sessions.map((s) => {
      const key = s.key as string | undefined;
      const storeEntry = key ? tokenMap.get(key) : undefined;
      return {
        ...s,
        inputTokens: storeEntry?.inputTokens,
        outputTokens: storeEntry?.outputTokens,
        totalTokens: storeEntry?.totalTokens,
      };
    });

    return NextResponse.json({
      count: parsed.count ?? enriched.length,
      sessions: enriched,
      stores,
      raw,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  bootApp();
  try {
    const { connectionId: cid, keys } = await req.json();
    const connectionId = cid ?? getDefaultConnection()?.id;

    if (!connectionId) {
      return NextResponse.json({ error: "No connection configured" }, { status: 400 });
    }
    if (!isSSHConnected(connectionId)) {
      return NextResponse.json({ error: "Not connected via SSH" }, { status: 400 });
    }
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "No session keys provided" }, { status: 400 });
    }

    const results: { key: string; ok: boolean; error?: string }[] = [];

    // Step 1: Get store paths from openclaw sessions listing
    const listRes = await executeOpenClawCommand(
      connectionId,
      "sessions --all-agents --json",
      30000,
    );
    let stores: { agentId: string; path: string }[] = [];
    try {
      const parsed = JSON.parse(listRes.stdout || "{}");
      stores = (parsed.stores as { agentId: string; path: string }[]) ?? [];
    } catch { /* keep empty */ }

    // Step 2: Remove matching keys from the store file (top-level keys)
    for (const store of stores) {
      const safePath = store.path.replace(/['"\\$`!]/g, "");
      const keysJson = JSON.stringify(keys);
      const b64Keys = Buffer.from(keysJson).toString("base64");

      const script = [
        `const fs=require("fs");`,
        `const keys=JSON.parse(Buffer.from("${b64Keys}","base64").toString());`,
        `const p="${safePath}";`,
        `let d;try{d=JSON.parse(fs.readFileSync(p,"utf8"))}catch{process.exit(0)}`,
        `let removed=0;`,
        `for(const k of keys){if(k in d){delete d[k];removed++}}`,
        `if(removed>0){fs.writeFileSync(p,JSON.stringify(d,null,2))}`,
        `console.log(JSON.stringify({ok:true,removed}))`,
      ].join("");

      try {
        const res = await executeCommand(
          connectionId,
          `node -e '${script.replace(/'/g, "'\\''")}'`,
          30000,
        );
        if (res.code === 0 && res.stdout.trim()) {
          try {
            const out = JSON.parse(res.stdout.trim());
            if (out.removed > 0) {
              for (const k of keys) {
                results.push({ key: k, ok: true });
              }
            }
          } catch { /* ignore parse errors */ }
        }
      } catch {
        // store file edit failed — skip
      }
    }

    // Mark any keys not yet in results as failed
    const doneKeys = new Set(results.map((r) => r.key));
    for (const k of keys) {
      if (!doneKeys.has(k)) {
        results.push({ key: k, ok: false, error: "Key not found in any store" });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
