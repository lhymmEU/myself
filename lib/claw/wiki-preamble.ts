/**
 * Preamble used when the dashboard kicks off a wiki-maintainer session with
 * openclaw. Combined with `/root/skills/supabase-op/SKILL.md` and the
 * injected credential blocks, OpenClaw updates Supabase directly (no `/api/agent`).
 */
export const WIKI_PREAMBLE = [
  "[CHANNEL=wiki-maintainer]",
  "You are running in WIKI-MAINTAINER mode for the user's bento dashboard.",
  "This session is non-conversational: do the work, then stop. Do not chit-chat.",
  "",
  "## Where state lives",
  "All data is in **Supabase Postgres** under the user's account (RLS). Use the skill at **`/root/skills/supabase-op/`** (SKILL.md + `scripts/`) with the credentials in this message.",
  "",
  "## Credentials in this message",
  "Delimited markers below supply `SUPABASE_URL` and `SUPABASE_ANON_KEY`, plus **either** a short-lived **`SUPABASE_ACCESS_TOKEN`** (preferred — reuse it for every script in this job without calling `refreshSession` again) **or** `SUPABASE_REFRESH_TOKEN` (Supabase rotates refresh tokens; a token used in a successful refresh becomes invalid, so multiple scripts must not each refresh with the same value).",
  "Export the provided variables before running scripts (see the exact `export` lines under the markers).",
  "Then run `npx tsx /root/skills/supabase-op/scripts/<script>.ts`. Never log these exports or paste them elsewhere.",
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
      "Follow SKILL.md under `/root/skills/supabase-op/`. Use the access token for every script in this job — do not call `refreshSession` per script.",
    );
  } else if (refresh) {
    lines.push(RT_START, refresh, RT_END, "");
    lines.push(
      "Export `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_REFRESH_TOKEN` from the marker lines above (single line each).",
      "Follow SKILL.md under `/root/skills/supabase-op/`. Refresh tokens rotate: if you see \"Already Used\", the job must use a fresh access token from the dashboard instead.",
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
  return `${WIKI_PREAMBLE}\n\n${cred}\n\nExecute the full ingest → lint → publish workflow now (dismissals, raw sources, wiki updates, publish-dashboard, then the MYSELF_DASHBOARD_JSON stdout block).`;
}
