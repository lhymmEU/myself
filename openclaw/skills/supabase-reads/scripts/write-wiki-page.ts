import { readFile } from "node:fs/promises";
import { createUserSupabase } from "./lib/user-client";

const slug = process.argv[2];
const mdPath = process.argv[3];
if (!slug || !mdPath) {
  console.error(
    "Usage: … tsx write-wiki-page.ts <slug> <path-to-markdown-file>",
  );
  process.exit(1);
}

const markdown = await readFile(mdPath, "utf8");
const supabase = await createUserSupabase();
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user?.id) {
  console.error("No user on session");
  process.exit(1);
}
const now = Date.now();
const userId = user.id;

const { data: existing } = await supabase
  .from("wiki_pages")
  .select("slug")
  .eq("user_id", userId)
  .eq("slug", slug)
  .maybeSingle();

if (existing) {
  const { error } = await supabase
    .from("wiki_pages")
    .update({ markdown, updated_at: now })
    .eq("user_id", userId)
    .eq("slug", slug);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
} else {
  const { error } = await supabase.from("wiki_pages").insert({
    user_id: userId,
    slug,
    markdown,
    updated_at: now,
  });
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
}
console.log(JSON.stringify({ ok: true, slug }));
