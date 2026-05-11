/**
 * Preamble used when the dashboard kicks off a wiki-maintainer session with
 * openclaw. Combined with `openclaw/skills/supabase-reads/SKILL.md` and the
 * injected credential blocks, OpenClaw updates Supabase directly (no `/api/agent`).
 */
export const WIKI_PREAMBLE = [
  "[CHANNEL=wiki-maintainer]",
  "You are running in WIKI-MAINTAINER mode for the user's bento dashboard.",
  "This session is non-conversational: do the work, then stop. Do not chit-chat.",
  "",
  "## Where state lives",
  "All data is in **Supabase Postgres** under the user's account (RLS). Use the repo skill **`openclaw/skills/supabase-reads/`** (SKILL.md + `scripts/`) with the credentials in this message.",
  "",
  "## Credentials in this message",
  "Between the `<<<MYSELF_SUPABASE_*_START>>>` / `<<<MYSELF_SUPABASE_*_END>>>` markers you will find three single-line values: project URL, anon key, and refresh token.",
  "Export them before running scripts:",
  "  export SUPABASE_URL='<url line>'",
  "  export SUPABASE_ANON_KEY='<anon key line>'",
  "  export SUPABASE_REFRESH_TOKEN='<refresh token line>'",
  "Then run `npx tsx openclaw/skills/supabase-reads/scripts/<script>.ts` from the **repository root** of this app (the clone on this host). Never log these exports or paste them elsewhere.",
  "",
  "## Three layers (Karpathy LLM-Wiki pattern)",
  "1) Raw layer — plans, marked items, wishes, skills. READ-ONLY via `read-raw-sources.ts`.",
  "2) Wiki layer — `read-wiki-page.ts`, `write-wiki-page.ts`, `search-wiki.ts`, `append-wiki-log.ts`, `read-wiki-log.ts`. Slugs are path-like (e.g. `syntheses/foo`).",
  "3) Schema — follow AGENTS conventions (`read-wiki-page.ts AGENTS` when needed).",
  "",
  "## What to do this session",
  "Run an ingest+lint+publish loop:",
  "  a. `dismissals-pending.ts` → fold user verbs into wiki → `dismissals-mark-ingested.ts` with processed ids.",
  "  b. `read-raw-sources.ts` → identify stale or missing synthesis / entity / query pages.",
  "  c. For each affected page: read wiki, then `write-wiki-page.ts` with updated markdown (YAML frontmatter: kind / goalId / confidence / freshness / sources). Citations like ^[plan:<id>:42-58].",
  "  d. `append-wiki-log.ts` with one line per op: '## [YYYY-MM-DD] ingest|lint|query | <summary>'.",
  "  e. Build the bento card list (≤9). Exactly one `heartbeat` card. Every card MUST have `wikiSlug`.",
  "  f. Write `{ \"cards\": [...] }` to a temp file, then `publish-dashboard.ts` that path.",
  "  g. MANDATORY — Print **exactly one** dashboard handoff block to stdout:",
  "       Line 1: <<<MYSELF_DASHBOARD_JSON_START>>>",
  "       Line 2..N: a single JSON object: {\"generatedAt\":<unix_ms>,\"cards\":[...]} (same card objects as publish).",
  "       Last line: <<<MYSELF_DASHBOARD_JSON_END>>>",
  "",
  "## Card kinds",
  "- synthesis, lint, gap, query, heartbeat (exactly one heartbeat).",
  "",
  "## Hard rules",
  "- Never modify raw sources.",
  "- Never publish a card without wikiSlug.",
  "- Never publish more than one heartbeat card.",
  "- If you have no sources for a topic, surface a `gap` card instead of inventing a synthesis.",
  "- Do NOT emit [CARD] JSON to stdout.",
  "",
  "## Quiet output",
  "Optional one-line status (≤200 chars) outside the mandatory JSON block.",
  "---",
].join("\n");

const URL_START = "<<<MYSELF_SUPABASE_URL_START>>>";
const URL_END = "<<<MYSELF_SUPABASE_URL_END>>>";
const ANON_START = "<<<MYSELF_SUPABASE_ANON_KEY_START>>>";
const ANON_END = "<<<MYSELF_SUPABASE_ANON_KEY_END>>>";
const RT_START = "<<<MYSELF_SUPABASE_REFRESH_TOKEN_START>>>";
const RT_END = "<<<MYSELF_SUPABASE_REFRESH_TOKEN_END>>>";

export function formatWikiIngestSupabaseCredentialBlock(opts: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  refreshToken: string;
}): string {
  const u = opts.supabaseUrl.trim();
  const a = opts.supabaseAnonKey.trim();
  const r = opts.refreshToken.trim();
  return [
    "## Supabase credentials (this run only)",
    URL_START,
    u,
    URL_END,
    ANON_START,
    a,
    ANON_END,
    RT_START,
    r,
    RT_END,
    "",
    "Export SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_REFRESH_TOKEN from the lines above, then follow SKILL.md under `openclaw/skills/supabase-reads/`.",
  ].join("\n");
}

/**
 * Full message sent to openclaw for a background wiki ingest job (non-streaming).
 */
export function buildWikiIngestMessage(opts: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  refreshToken: string;
}): string {
  const cred = formatWikiIngestSupabaseCredentialBlock(opts);
  return `${WIKI_PREAMBLE}\n\n${cred}\n\nExecute the full ingest → lint → publish workflow now (dismissals, raw sources, wiki updates, publish-dashboard, then the MYSELF_DASHBOARD_JSON stdout block).`;
}
