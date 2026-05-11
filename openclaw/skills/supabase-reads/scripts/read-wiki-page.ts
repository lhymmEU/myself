import { createClient } from "@supabase/supabase-js";

const slug = process.argv[2];
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = process.env.MYSELF_SUPABASE_ACCESS_TOKEN;

if (!url || !anon || !token || !slug) {
  console.error(
    "Usage: MYSELF_SUPABASE_ACCESS_TOKEN=... SUPABASE_URL=... SUPABASE_ANON_KEY=... tsx read-wiki-page.ts <slug>",
  );
  process.exit(1);
}

const supabase = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${token}` } },
});

const { data, error } = await supabase
  .from("wiki_pages")
  .select("slug, markdown, updated_at")
  .eq("slug", slug)
  .maybeSingle();

if (error) {
  console.error(error.message);
  process.exit(1);
}
if (!data) {
  console.log("null");
  process.exit(0);
}
console.log(data.markdown);
