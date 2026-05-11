import { createUserSupabase } from "./lib/user-client";

const tail = Math.max(1, Number(process.argv[2]) || 50);
const supabase = await createUserSupabase();

const { data, error } = await supabase
  .from("wiki_log_entries")
  .select("body, created_at")
  .order("created_at", { ascending: false })
  .limit(tail);

if (error) {
  console.error(error.message);
  process.exit(1);
}
const lines = (data ?? []).reverse().map((r) => r.body as string);
console.log(lines.join("\n"));
