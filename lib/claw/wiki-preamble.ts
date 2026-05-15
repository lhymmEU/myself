import { OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON } from "@/lib/claw/constants";

/**
 * Preamble used when the dashboard kicks off a wiki-maintainer session with
 * openclaw. Combined with `/root/skills/supabase-reads/SKILL.md` and the
 * injected credential blocks, OpenClaw updates the file wiki on the agent
 * host and writes dashboard cards to **`${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}`**;
 * the app server reads that file over SSH after ingest and stores JSON in
 * `wiki_ingest_state.generative_cards_json`.
 */
export const WIKI_PREAMBLE = [
  "[CHANNEL=wiki-maintainer]",
  "You are running in WIKI-MAINTAINER mode for the user's bento dashboard.",
  "This session is non-conversational: do the work, then stop. Do not chit-chat.",
  "",
  "## Where state lives",
  "1) **Raw user data** — Supabase Postgres (RLS). Read-only for you via scripts in **`/root/skills/supabase-reads/scripts/`** (see that skill's `read-raw-sources.ts`, dismissals helpers).",
  "2) **Wiki** — Markdown files on **this machine** only under the vault path documented in **`/root/skills/supabase-reads/SKILL.md`** (file wiki section). The web app does not load wiki bodies from the database.",
  `3) **Dashboard cards** — write **exactly five** cards as a JSON object \`{ \"cards\": [ ... ] }\` to **\`${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}\`** on this host. If the file already exists, **replace** it entirely with the new JSON (same path). The dashboard **does not** parse cards from your stdout; it \`cat\`s this file after your session. Do not write to any \`dashboard_cards\` table.`,
  "",
  "## Credentials in this message",
  "Delimited markers below supply `SUPABASE_URL` and `SUPABASE_ANON_KEY`, plus **`SUPABASE_ACCESS_TOKEN`** when available (preferred for scripts — reuse for every call without `refreshSession` per script), and optionally **`SUPABASE_REFRESH_TOKEN`** for the same user so scripts can refresh **once** if the access JWT expires during this long job. If only a refresh token is present, it rotates on use — do not run many parallel `refreshSession` calls with the same value.",
  "Export the provided variables before running scripts (see the exact `export` lines under the markers).",
  "Then run `npx tsx /root/skills/supabase-reads/scripts/<script>.ts`. Never log these exports or paste them elsewhere.",
  "",
  "## Three layers (Karpathy LLM-Wiki pattern)",
  "1) **Raw layer** — plans, marked, wishes, skills, todos, wishlist todos, invoices, mind map, finance. READ-ONLY via `read-raw-sources.ts` from the supabase-reads skill.",
  "2) **Wiki layer** — markdown on disk (vault layout in supabase-reads SKILL): edit existing pages, cross-link, resolve contradictions, log short lines in `changelog.md` on the host (not Postgres).",
  `3) **Cards layer** — exactly **five** tiles, fixed roles and \`slot\` names per **\`/root/skills/supabase-reads/SKILL.md\`** (\`current_status\`, \`going_right\`, \`deviating\`, \`suggestions\`, \`heartbeat\`). Write valid JSON to **\`${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}\`**. Optional per-card **\`presentation\`** (blocks) and **\`richMarkdown\`** on \`body\` improve the in-app generative layout.`,
  "",
  "## What to do this session",
  `Run: Supabase scripts → file wiki → write \`${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}\`.`,
  "  a. `npx tsx /root/skills/supabase-reads/scripts/dismissals-pending.ts` → process → `dismissals-mark-ingested.ts` with ids (if you consumed pending rows).",
  "  b. `npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts` (full bundle — no args) → load **all** wish categories and cross-check **activity** (plans, marked, skills, todos, wishlist_todos, invoices + clients, mind_map, finance).",
  "  c. Follow the **File wiki** section in **`/root/skills/supabase-reads/SKILL.md`**: dismissals (if any) folded into wiki files; update syntheses / wishes / profile pages based on raw sources.",
  "  d. Build **exactly five** cards per the SKILL table: (1) current status vs wishes, (2) what's going right, (3) what's deviating / hindering, (4) suggestions toward wishes, (5) heartbeat summary of **this** ingest. Use the prescribed **`slot`** and **`kind`** values from the SKILL. Cite **`sources`** on every card; `wikiSlug` optional.",
  `  e. Write \`{ \"cards\": [ ... ] }\` (five entries) to **\`${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON}\`** — create or overwrite the file. Ensure the directory exists (e.g. \`mkdir -p /root/skills/supabase-reads\`). Valid UTF-8 JSON only; no markdown fences inside the file unless you also produce valid parseable JSON.`,
  "",
  "## Card kinds (for the five slots)",
  "- `current_status`, `going_right`, `suggestions` → typically `synthesis`.",
  "- `deviating` → `lint`.",
  "- `heartbeat` → `heartbeat` (exactly one).",
  "",
  "## Hard rules",
  "- Never modify raw sources in Supabase.",
  "- Never emit more or fewer than **five** cards; never more than one `heartbeat`.",
  "- If evidence is thin for a slot, lower `confidence` and say so — do not invent facts.",
  "- Do NOT rely on a Supabase `dashboard_cards` table — it is not used.",
  "- Do **not** rely on stdout markers for card delivery — the app reads **`cards.json`** only.",
  "",
  "## Quiet output",
  "Optional short status lines on stdout or stderr are fine; card delivery is **only** via the JSON file above.",
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
  /** Use with access for long jobs (JWT expiry) or alone (refreshSession per process). */
  refreshToken?: string | null;
}): string {
  const u = opts.supabaseUrl.trim();
  const a = opts.supabaseAnonKey.trim();
  const access = opts.accessToken?.trim();
  const refresh = opts.refreshToken?.trim();

  const lines: string[] = ["## Supabase credentials (this run only)", URL_START, u, URL_END, ANON_START, a, ANON_END];

  if (access && refresh) {
    lines.push(AT_START, access, AT_END, RT_START, refresh, RT_END, "");
    lines.push(
      "Export `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_REFRESH_TOKEN` from the marker lines above (single line each).",
      "Follow **`/root/skills/supabase-reads/SKILL.md`**. Scripts prefer the access token (no `refreshSession` per script). If the access JWT expires mid-job, call `refreshSession` **once** with the refresh token, export the new `SUPABASE_ACCESS_TOKEN` from the response, and continue — do not rotate the refresh token repeatedly across parallel script processes.",
    );
  } else if (access) {
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
  return `${WIKI_PREAMBLE}\n\n${cred}\n\nExecute the full workflow now: file wiki (supabase-reads SKILL vault section), then supabase-reads scripts (dismissals if needed, read-raw-sources), then write the five-card JSON to ${OPENCLAW_REMOTE_SUPABASE_READS_CARDS_JSON} (create or overwrite). The ingest is incomplete until that file exists with valid JSON — the dashboard treats missing or invalid cards as a failed run.`;
}
