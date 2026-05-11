import { randomUUID } from "node:crypto";
import { createUserSupabase } from "./lib/user-client";

const entry = process.argv.slice(2).join(" ").trim();
if (!entry) {
  console.error("Usage: … tsx append-wiki-log.ts <log line text>");
  process.exit(1);
}

const line = entry.endsWith("\n") ? entry.slice(0, -1) : entry;
const supabase = await createUserSupabase();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user?.id) {
  console.error("No user on session");
  process.exit(1);
}

const { error } = await supabase.from("wiki_log_entries").insert({
  id: randomUUID().replace(/-/g, ""),
  user_id: user.id,
  body: line,
  created_at: Date.now(),
});

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(JSON.stringify({ ok: true }));
