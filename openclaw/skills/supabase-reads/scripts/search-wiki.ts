import { createUserSupabase } from "./lib/user-client";

const query = (process.argv[2] ?? "").trim();
const max = Math.min(50, Math.max(1, Number(process.argv[3]) || 12));
if (!query) {
  console.error("Usage: … tsx search-wiki.ts <substring> [max=12]");
  process.exit(1);
}

const supabase = await createUserSupabase();
const needle = query.toLowerCase();
const pattern = `%${query.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

const { data: rows, error } = await supabase
  .from("wiki_pages")
  .select("slug, markdown")
  .neq("slug", "AGENTS")
  .ilike("markdown", pattern)
  .limit(max);

if (error) {
  console.error(error.message);
  process.exit(1);
}

const hits: { slug: string; excerpt: string }[] = [];
for (const row of rows ?? []) {
  const raw = row.markdown as string;
  const idx = raw.toLowerCase().indexOf(needle);
  if (idx < 0) continue;
  const start = Math.max(0, idx - 60);
  const end = Math.min(raw.length, idx + needle.length + 120);
  hits.push({ slug: row.slug as string, excerpt: raw.slice(start, end).trim() });
}
console.log(JSON.stringify({ hits }, null, 2));
