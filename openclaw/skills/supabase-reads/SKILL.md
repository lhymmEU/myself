---
name: myself-supabase-reads
description: >-
  OpenClaw helpers: file wiki (Karpathy LLM-wiki) on the agent host, read user
  context from Supabase (plans, marked, wishes, skills, todos, wishlist todos,
  invoices, mind map, finance), card dismissals, and five wish-aligned
  dashboard cards written to cards.json for the app to pull after ingest.
  Authenticated user RLS for Supabase scripts.
---

# Myself — Supabase reads + file wiki + `cards.json` (OpenClaw)

## Credentials (injected by the dashboard each run)

The wiki-ingest job message includes delimited values **between these markers** (single line each unless noted):

- `<<<MYSELF_SUPABASE_URL_START>>>` … `<<<MYSELF_SUPABASE_URL_END>>>` — project URL
- `<<<MYSELF_SUPABASE_ANON_KEY_START>>>` … `<<<MYSELF_SUPABASE_ANON_KEY_END>>>` — anon / publishable key
- **Preferred (multi-script safe):** `<<<MYSELF_SUPABASE_ACCESS_TOKEN_START>>>` … `<<<MYSELF_SUPABASE_ACCESS_TOKEN_END>>>` — short-lived user access JWT from the dashboard session
- **Strongly recommended with the above (long ingests):** `<<<MYSELF_SUPABASE_REFRESH_TOKEN_START>>>` … `<<<MYSELF_SUPABASE_REFRESH_TOKEN_END>>>` — same Supabase session’s refresh token so scripts can call `refreshSession` **once** if the access JWT expires mid-job
- **Fallback (saved token / no browser session):** same refresh markers only — user refresh token from **Settings → OpenClaw / wiki ingest** (Supabase **rotates** these on each successful `refreshSession`; do not run many scripts each calling `refreshSession` with the same value)

**Before running any script**, export the variables your message includes:

```bash
export SUPABASE_URL='<paste URL line>'
export SUPABASE_ANON_KEY='<paste anon key line>'
# When access-token markers are present (normal Wiki ingest from a signed-in browser):
export SUPABASE_ACCESS_TOKEN='<paste access token line>'
# When refresh-token markers are also present (recommended), export both — scripts use access first; if it is expired, they refresh once using this refresh token:
export SUPABASE_REFRESH_TOKEN='<paste refresh token line>'
# Only when there is no access token block (legacy / single-shot):
# export SUPABASE_REFRESH_TOKEN='<paste refresh token line>'
```

Never log these values, commit them to git, or paste them into unrelated services.

When the dashboard sends session tokens from a signed-in browser, the job usually includes **both** access and refresh markers — export both. A refresh token saved under **Settings → OpenClaw / wiki ingest** is optional backup when ingest is started without a browser session.

## How auth works

When the dashboard sends **both** an access token and a refresh token (normal **Wiki ingest** from a signed-in browser), export **both** before running scripts. The TypeScript helpers use the access JWT when it is still valid; if it is expired or near expiry, they call `refreshSession` **once** with the refresh token and continue.

When only **`SUPABASE_ACCESS_TOKEN`** is set, scripts attach it as the PostgREST `Authorization` bearer and **do not** call `refreshSession` — safe for many `npx tsx …` invocations in one ingest **while the JWT remains valid**.

When only **`SUPABASE_REFRESH_TOKEN`** is set, scripts call `refreshSession` once per process; that **invalidates** the refresh token value for reuse, so parallel or repeated script runs can fail with `Invalid Refresh Token: Already Used`.

Either path runs PostgREST as **your** user (`auth.uid()`). Never use `SUPABASE_SERVICE_ROLE_KEY` on the OpenClaw host.

## Skill layout (OpenClaw host)

Install the skill on the agent machine. Paths (adjust if you symlink elsewhere):

```text
/root/skills/supabase-reads/SKILL.md
/root/skills/supabase-reads/scripts/     ← TypeScript helpers (npx tsx)
/root/skills/supabase-reads/cards.json   ← you write dashboard payload here
```

Run scripts with `npx tsx` (Node 20+). Ensure `@supabase/supabase-js` is installed where Node resolves modules (for example `package.json` + `npm install` under `/root/skills/supabase-reads/`).

## File wiki (on this host — not in Postgres)

This skill includes the **LLM Wiki** workflow from Andrej Karpathy’s gist: [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Core idea:** maintain **persistent, compounding** markdown notes — cross-linked, revised when new evidence arrives, with contradictions called out. The wiki supports a precise user profile and progress toward wishes.

### Vault location

Use a single root on this machine, stay consistent across sessions:

```text
/root/skills/myself-wiki/vault/
```

(You may keep the historical `myself-wiki` folder name for the vault only; the skill instructions live in **this** `SKILL.md`.) Document the path you chose in `vault/INDEX.md` the first time.

### Recommended layout

| Path | Purpose |
|------|---------|
| `INDEX.md` | Map of pages, last-updated notes, navigation |
| `profile/` | Stable facts, constraints, preferences (update in place) |
| `wishes/` | One file per wish category or id; link to evidence |
| `syntheses/` | Cross-domain “what is true now” pages (merge, don’t only append) |
| `open-questions.md` | Gaps when evidence is thin (pairs with `gap` dashboard cards) |
| `changelog.md` | Short one-line entries per ingest |

### Conventions

- **Paths:** slug-like segments (`syntheses/alignment-2026-05.md`). Prefer updating an existing page over spawning duplicates.
- **Frontmatter (optional):** `kind`, `confidence`, `freshness`, wish/goal ids — whatever helps you track staleness.
- **Citations:** reference Supabase entity ids from `read-raw-sources.ts` (plan ids, todo ids, invoice ids, etc.) so the file wiki stays traceable to raw rows.
- **Contradictions:** surface them explicitly (section or `contradictions.md`) and resolve or mark “unresolved” with dates.
- **User card verbs** (`card_dismissals`): when you read pending dismissals via the scripts here, fold confirms/contradicts into the relevant wiki pages before marking ingested.

## Scripts (Supabase reads only)

| Script | Purpose |
|--------|---------|
| `read-raw-sources.ts` `[kinds]` | JSON to stdout. **No arg or `all`:** full bundle (`plans`, `marked`, `wishes`, `skills`, `todos`, `wishlist_todos`, `invoices`, `mind_map`, `finance`). Otherwise comma-separated subset (e.g. `plans,wishes`). `invoices` returns `{ invoices, clients }`; `mind_map` returns `{ scenes, nodes }`; `finance` returns `{ accounts, transactions, budgets, investments }`. |
| `dismissals-pending.ts` | JSON `{ dismissals: [...] }` where `ingested === 0` |
| `dismissals-mark-ingested.ts` `<id>…` | Mark dismissal rows ingested |

### Example invocations

```bash
npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts
npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts plans,wishes,finance
```

## Dashboard cards — `cards.json` (not stdout)

After the wiki pass, write **exactly one** JSON document to:

```text
/root/skills/supabase-reads/cards.json
```

- Shape: `{ "cards": [ … ] }` with **exactly five** objects (pretty or minified UTF-8 JSON).
- If **`cards.json` already exists**, **overwrite** the whole file with the new content (same path). Prefer atomic replace when your environment allows (write temp file then `mv`) so the dashboard never reads a half-written file.
- The app server reads this file over SSH after wiki ingest succeeds.
- **Do not** write cards to Postgres.

### Exactly five cards — wish-aligned insights

Produce **exactly five** objects in `cards`, each with a fixed **`slot`** (stable per user) and content that matches the role below. Each card must include **`sources`** (see app `SourceRef`) tied to real ids from `read-raw-sources.ts`. `wikiSlug` is optional metadata.

| # | `slot` | Role | `kind` | What to cover |
|---|--------|------|--------|----------------|
| 1 | `current_status` | **Current status** — measure how far the user is from their **stated wishes** (distance, gaps, pace). Evidence-based; call out thin evidence with `confidence`. | `synthesis` | Wishes vs observable activity across raw data. |
| 2 | `going_right` | **What’s going right** — behaviours, habits, or wins that **help** them move toward their wishes. | `synthesis` | Reinforce with concrete `sources`. |
| 3 | `deviating` | **What’s deviating** — warnings on what they are doing that **hinders** progress toward wishes. Non-judgmental, evidence-backed. | `lint` | Clear tie to wishes + sources. |
| 4 | `suggestions` | **Suggestions** — concrete next steps to move **toward** their wishes (actionable, prioritized lightly). | `synthesis` or `query` | Prefer `synthesis` when you have sources; `query` only if you must ask a clarifying question. |
| 5 | `heartbeat` | **Heartbeat** — short summary of **this** wiki ingestion (what you touched, what changed, freshness for the user). | `heartbeat` | One card only; keep it brief. |

Titles and bodies should be **UI-short** (the wiki holds depth). Optional **`presentation`** (`blocks`) and **`richMarkdown": true`** on `body` improve the in-app layout (see app `GenerativeBlock`).

## Ingest workflow

1. Optional: `dismissals-pending.ts` → fold user verbs into the **file wiki** (not Postgres) → `dismissals-mark-ingested.ts` with processed ids.
2. **`read-raw-sources.ts`** (no args = full raw bundle) — load wishes (`learn`, `place`, `goal`) and cross-check activity: plans, marked, skills, todos, wishlist_todos, invoices (+ clients), mind map (scenes + life_nodes), finance (accounts, transactions, budgets, investments).
3. **Edit the vault** — integrate new facts, tighten syntheses, refresh wish pages; append one line to `changelog.md`.
4. Build the **five** cards above from wishes + vault. **Not** the wiki text itself in the cards — tiles are summaries for the app UI.
5. Write `{ "cards": [ … ] }` to **`/root/skills/supabase-reads/cards.json`** (create or full overwrite).

## Tables (snake_case in Postgres)

**Read-only (raw context):** `plan_pages`, `marked_collections`, `marked_items`, `user_wishes`, `user_skills`, `todos`, `wishlist_todos`, `invoices`, `invoice_clients`, `mind_map_scenes`, `life_nodes`, `finance_accounts`, `finance_transactions`, `finance_budgets`, `finance_investments`

**Read + acknowledge:** `card_dismissals` (`ingested` flag)

**Dashboard cards:** **not** stored in Supabase. After ingest, the app reads **`/root/skills/supabase-reads/cards.json`** over SSH and persists JSON in **`wiki_ingest_state.generative_cards_json`** for the UI.

**RLS:** If a query returns “permission denied” or empty when the UI shows data, fix policies in Supabase — do not escalate to service role.

## Hard rules

- Never modify raw source tables.
- **Exactly five** cards per ingest, with the **`slot`** names in the table above (one `heartbeat` only).
- If you have no sources for a slice, use `confidence: "thin"` or a careful `gap`-style body inside the same slot’s role — do not invent facts.
- Do **not** create `wiki_pages` or `wiki_log_entries` in Supabase; those tables are not part of this product anymore.
- Do **not** assume a `dashboard_cards` table exists.
- Do **not** use stdout delimited markers for card delivery — use **`cards.json`** only.
