import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = process.env.MYSELF_SUPABASE_ACCESS_TOKEN;

if (!url || !anon || !token) {
  console.error(
    "Set SUPABASE_URL, SUPABASE_ANON_KEY, MYSELF_SUPABASE_ACCESS_TOKEN",
  );
  process.exit(1);
}

const supabase = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});

const { data, error } = await supabase
  .from("wiki_pages")
  .select("slug")
  .order("slug");

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log(JSON.stringify(data?.map((r) => r.slug) ?? [], null, 2));
