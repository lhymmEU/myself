import { createUserSupabase } from "./lib/user-client";

const supabase = await createUserSupabase();
const { data, error } = await supabase
  .from("card_dismissals")
  .select("*")
  .eq("ingested", 0)
  .order("created_at", { ascending: true });

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(JSON.stringify({ dismissals: data ?? [] }, null, 2));
