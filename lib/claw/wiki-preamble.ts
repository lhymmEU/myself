/**
 * Preamble used when the dashboard kicks off a wiki-maintainer session with
 * openclaw. Combined with `/root/skills/supabase-reads/SKILL.md`,
 * `/root/skills/myself-wiki/SKILL.md`, and the injected credential blocks,
 * OpenClaw updates the file wiki on the agent host and writes dashboard cards
 * to Supabase via `publish-dashboard.ts` (no wiki tables in Postgres).
 */
export const WIKI_PREAMBLE = [
  "[CHANNEL=wiki-maintainer]",
  "You are running in WIKI-MAINTAINER mode for the user's bento dashboard.",
  "This session is non-conversational: do the work, then stop. Do not chit-chat.",
  "",
  "## Where state lives",
  "1) **Raw user data** — Supabase Postgres (RLS). Read-only for you via scripts in **`/root/skills/supabase-reads/scripts/`** (see that skill's `read-raw-sources.ts`, dismissals helpers).",
  "2) **Wiki** — Markdown files on **this machine** only, under the vault path in **`/root/skills/myself-wiki/SKILL.md`**. The web app does not load wiki bodies from the database.",
  "3) **Dashboard cards** — Supabase table `dashboard_cards`. Written only via **`publish-dashboard.ts`** from the supabase-reads skill.",
  "",
  "## Credentials in this message",
  "Delimited markers below supply `SUPABASE_URL` and `SUPABASE_ANON_KEY`, plus **either** a short-lived **`SUPABASE_ACCESS_TOKEN`** (preferred — reuse it for every Supabase script in this job without calling `refreshSession` again) **or** `SUPABASE_REFRESH_TOKEN` (Supabase rotates refresh tokens; a token used in a successful refresh becomes invalid, so multiple scripts must not each refresh with the same value).",
  "Export the provided variables before running scripts (see the exact `export` lines under the markers).",
  "Then run `npx tsx /root/skills/supabase-reads/scripts/<script>.ts`. Never log these exports or paste them elsewhere.",
  "",
  "## Three layers (Karpathy LLM-Wiki pattern)",
  "1) **Raw layer** — plans, marked, wishes, skills, todos, wishlist todos, invoices, mind map, finance. READ-ONLY via `read-raw-sources.ts` from the supabase-reads skill.",
  "2) **Wiki layer** — markdown on disk per **myself-wiki** skill: edit existing pages, cross-link, resolve contradictions, log short lines in `changelog.md` on the host (not Postgres).",
  "3) **Cards layer** — ≤9 `dashboard_cards` summarizing wishes vs reality for the UI. Run **`publish-dashboard.ts`** after the wiki pass; optional `wikiSlug` on cards is metadata only.",
  "",
  "## What to do this session",
  "Run: file-wiki maintenance → read Supabase context → publish cards.",
  "  a. Follow **`/root/skills/myself-wiki/SKILL.md`**: dismissals (if any) folded into wiki files; update syntheses / wishes / profile pages from evidence.",
  "  b. `npx tsx /root/skills/supabase-reads/scripts/dismissals-pending.ts` → process → `dismissals-mark-ingested.ts` with ids (if you consumed pending rows).",
  "  c. `npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts` (full bundle — no args) → load **all** wish categories and cross-check **activity** (plans, marked, skills, todos, wishlist_todos, invoices + clients, mind_map, finance).",
  "  d. Build the bento card list (≤9) as an **eagle view toward the user's wishes**. Exactly one `heartbeat` card. Prefer stable **`slot`** (see supabase-reads SKILL.md). Cite **`sources`** on each card; `wikiSlug` optional.",
  "  e. Write `{ \"cards\": [...] }` to a temp file, then `npx tsx /root/skills/supabase-reads/scripts/publish-dashboard.ts` that path. **This is the only delivery path** — the web app loads tiles from Supabase (`dashboard_cards`); do **not** rely on printing dashboard JSON to stdout.",
  "",
  "## Card kinds",
  "- synthesis, lint, gap, query, heartbeat (exactly one heartbeat).",
  "- Each card object should include `slot` (lowercase snake_case, ≤48 chars, [a-z0-9_]) for stable identity; omit custom `id` unless retiring a slot.",
  "",
  "## Hard rules",
  "- Never modify raw sources in Supabase.",
  "- Never publish more than one heartbeat card.",
  "- If you have no sources for a topic, surface a `gap` card instead of inventing a synthesis.",
  "- Do NOT emit [CARD] JSON to stdout.",
  "",
  "## Quiet output",
  "Optional one-line status (≤200 chars) on stdout for your own logs; the server does not parse dashboard data from stdout.",
  "---",
].join("\n");

const URL_START = "<<<MYSELF_SUPABASE_URL_START>>>";
const URL_END = "<<<MYSELF_SUPABASE_URL_END>>>";
const ANON_START = "<<<MYSELF_SUPABASE_ANON_KEY_START>>>";
const ANON_END = "<<<MYSELF_SUPABASE_ANON_KEY_END>>>";
const RT_START = "<<<MYSELF_SUPABASE_REFRESH_TOKEN_START>>>";
const RT_END = "<<<MYSELF_SUPABASE_REFRESH_TOKEN_END>>>";
const AT_START = "<<<MYSELF_SUPABASE_ACCESS_TOKEN_START>>>";
const AT_END = "<<<MYSELF_SUPABASE_ACCESS_TOKEN_END>>>";

export function formatWikiIngestSupabaseCredentialBlock(opts: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  /** Prefer for multi-script jobs — avoids refresh-token rotation / "Already Used". */
  accessToken?: string | null;
  /** Legacy / fallback when no access token is available for this message. */
  refreshToken?: string | null;
}): string {
  const u = opts.supabaseUrl.trim();
  const a = opts.supabaseAnonKey.trim();
  const access = opts.accessToken?.trim();
  const refresh = opts.refreshToken?.trim();

  const lines: string[] = ["## Supabase credentials (this run only)", URL_START, u, URL_END, ANON_START, a, ANON_END];

  if (access) {
    lines.push(AT_START, access, AT_END, "");
    lines.push(
      "Export `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the URL/anon marker lines above, and `SUPABASE_ACCESS_TOKEN` from the access-token markers (single line each).",
      "Follow **`/root/skills/supabase-reads/SKILL.md`**. Use the access token for every **supabase-reads** script in this job — do not call `refreshSession` per script.",
    );
  } else if (refresh) {
    lines.push(RT_START, refresh, RT_END, "");
    lines.push(
      "Export `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_REFRESH_TOKEN` from the marker lines above (single line each).",
      "Follow **`/root/skills/supabase-reads/SKILL.md`**. Refresh tokens rotate: if you see \"Already Used\", the job must use a fresh access token from the dashboard instead.",
    );
  } else {
    lines.push("", "(No access or refresh token in this block — cannot authenticate.)");
  }

  return lines.join("\n");
}

/**
 * Full message sent to openclaw for a background wiki ingest job (non-streaming).
 */
export function buildWikiIngestMessage(opts: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken?: string | null;
  refreshToken?: string | null;
}): string {
  const cred = formatWikiIngestSupabaseCredentialBlock(opts);
  return `${WIKI_PREAMBLE}\n\n${cred}\n\nExecute the full workflow now: myself-wiki vault updates, then supabase-reads (dismissals if needed, read-raw-sources, publish-dashboard).`;
}
