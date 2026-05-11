import { createUserSupabase } from "./lib/user-client";

const kindsArg = process.argv[2]?.trim();
const kinds =
  kindsArg && kindsArg !== "all"
    ? new Set(kindsArg.split(",").map((k) => k.trim()))
    : new Set(["plans", "marked", "wishes", "skills"]);

try {
const supabase = await createUserSupabase();
const out: Record<string, unknown> = {};

if (kinds.has("plans")) {
  const { data, error } = await supabase
    .from("plan_pages")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  out.plans = data ?? [];
}

if (kinds.has("marked")) {
  const [collections, items] = await Promise.all([
    supabase.from("marked_collections").select("*").order("sort_order"),
    supabase.from("marked_items").select("*").order("sort_order"),
  ]);
  if (collections.error) throw new Error(collections.error.message);
  if (items.error) throw new Error(items.error.message);
  out.marked = {
    collections: collections.data ?? [],
    items: items.data ?? [],
  };
}

if (kinds.has("wishes")) {
  const { data, error } = await supabase.from("user_wishes").select("*");
  if (error) throw new Error(error.message);
  out.wishes = data ?? [];
}

if (kinds.has("skills")) {
  const { data, error } = await supabase.from("user_skills").select("*");
  if (error) throw new Error(error.message);
  out.skills = data ?? [];
}

console.log(JSON.stringify(out, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
