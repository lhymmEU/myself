import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import {
  CONFIG_PATH,
  decodeJwtPayload,
  writeConfig,
  type WatcherConfig,
} from "./config";
import { installSkill, installSkillDeps } from "./skill-installer";
import { BAKED_SUPABASE_URL } from "./generated/build-info";

export async function runInit(): Promise<void> {
  const supabaseUrl = process.env.MYSELF_SUPABASE_URL || BAKED_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error(
      "This watcher has no Supabase URL baked in. Set MYSELF_SUPABASE_URL " +
        "before running init.",
    );
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  console.log("");
  console.log("Paste the token from your dashboard (Settings → Agent).");
  console.log("It is one long line starting with `eyJ`.");
  console.log("");
  const token = (await rl.question("Token: ")).trim();
  rl.close();

  if (!token) {
    throw new Error("No token provided.");
  }

  const claims = decodeJwtPayload(token);
  if (claims.agent !== true) {
    throw new Error(
      "This token is not an agent token. Re-issue it from Settings → Agent.",
    );
  }
  const userId = typeof claims.sub === "string" ? claims.sub : "";
  if (!userId) {
    throw new Error("Token has no user id (sub claim).");
  }

  const config: WatcherConfig = { supabaseUrl, userId, token };

  // Sanity-check the token by selecting our registration row.
  process.stdout.write("Validating token with Supabase... ");
  const supabase = createClient(supabaseUrl, token, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { error } = await supabase
    .from("agent_registrations")
    .select("user_id")
    .eq("user_id", userId)
    .single();
  if (error) {
    process.stdout.write("failed.\n");
    throw new Error(
      `Token validation failed: ${error.message}. ` +
        "Re-issue the token from Settings → Agent and try again.",
    );
  }
  process.stdout.write("ok.\n");

  await writeConfig(config);
  console.log(`✓ Saved config to ${CONFIG_PATH}`);

  const { target, fileCount } = await installSkill();
  console.log(`✓ Wrote ${fileCount} skill files to ${target}`);

  await installSkillDeps(target);

  console.log("");
  console.log("Ready. Start the watcher with:");
  console.log("  node myself-op.js start");
  console.log("");
  console.log("Use systemd / pm2 / nohup to keep it running across reboots.");
}
