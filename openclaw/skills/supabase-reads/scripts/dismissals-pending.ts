import { createUserSupabase } from "./lib/user-client";

async function main() {
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
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
