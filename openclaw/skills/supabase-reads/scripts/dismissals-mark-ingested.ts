import { createUserSupabase } from "./lib/user-client";

const ids = process.argv.slice(2).filter(Boolean);
if (ids.length === 0) {
  console.error("Usage: … tsx dismissals-mark-ingested.ts <id> [id…]");
  process.exit(1);
}

const supabase = await createUserSupabase();
for (const id of ids) {
  const { error } = await supabase
    .from("card_dismissals")
    .update({ ingested: 1 })
    .eq("id", id);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
}
console.log(JSON.stringify({ count: ids.length }));
