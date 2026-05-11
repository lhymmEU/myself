import { createUserSupabase } from "./lib/user-client";

const slug = process.argv[2];
if (!slug) {
  console.error(
    "Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_REFRESH_TOKEN=... tsx read-wiki-page.ts <slug>",
  );
  process.exit(1);
}

const supabase = await createUserSupabase();

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
