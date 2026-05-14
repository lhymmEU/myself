---
name: myself-supabase-reads
description: >-
  OpenClaw helpers to read user context from Supabase (plans, marked, wishes,
  skills, todos, wishlist todos, invoices, mind map, finance) and card
  dismissals, and to publish dashboard_cards only. Authenticated user RLS.
  Wiki lives on the agent host (see myself-wiki skill), not in Postgres.
---

# Myself — Supabase reads + dashboard publish (OpenClaw)

## Credentials (injected by the dashboard each run)

The wiki-ingest job message includes delimited values **between these markers** (single line each unless noted):

- `<<<MYSELF_SUPABASE_URL_START>>>` … `<<<MYSELF_SUPABASE_URL_END>>>` — project URL
- `<<<MYSELF_SUPABASE_ANON_KEY_START>>>` … `<<<MYSELF_SUPABASE_ANON_KEY_END>>>` — anon / publishable key
- **Preferred (multi-script safe):** `<<<MYSELF_SUPABASE_ACCESS_TOKEN_START>>>` … `<<<MYSELF_SUPABASE_ACCESS_TOKEN_END>>>` — short-lived user access JWT from the dashboard session
- **Fallback:** `<<<MYSELF_SUPABASE_REFRESH_TOKEN_START>>>` … `<<<MYSELF_SUPABASE_REFRESH_TOKEN_END>>>` — user refresh token (Supabase **rotates** these on each successful `refreshSession`; do not run many scripts each calling `refreshSession` with the same value)

**Before running any script**, export the variables your message includes:

```bash
export SUPABASE_URL='<paste URL line>'
export SUPABASE_ANON_KEY='<paste anon key line>'
# Prefer when the access-token markers are present:
export SUPABASE_ACCESS_TOKEN='<paste access token line>'
# Only when there is no access token block (legacy / single-shot):
# export SUPABASE_REFRESH_TOKEN='<paste refresh token line>'
```

Never log these values, commit them to git, or paste them into unrelated services.

When the dashboard sends an access token (normal **Wiki ingest** from a signed-in browser), you do not need a saved refresh token for that job. You can still save a refresh token under **Settings → OpenClaw / wiki ingest** as a fallback.

## How auth works

When **`SUPABASE_ACCESS_TOKEN`** is set, scripts attach it as the PostgREST `Authorization` bearer and **do not** call `refreshSession` — safe for many `npx tsx …` invocations in one ingest.

When only **`SUPABASE_REFRESH_TOKEN`** is set, scripts call `refreshSession` once per process; that **invalidates** the refresh token value for reuse, so parallel or repeated script runs can fail with `Invalid Refresh Token: Already Used`.

Either path runs PostgREST as **your** user (`auth.uid()`). Never use `SUPABASE_SERVICE_ROLE_KEY` on the OpenClaw host.

## Script location (OpenClaw host)

Install the skills on the agent machine. This skill’s TypeScript scripts live here (adjust if you symlink another path):

```text
/root/skills/supabase-reads/scripts/
```

(`SKILL.md` sits alongside as `/root/skills/supabase-reads/SKILL.md`.) Run scripts with `npx tsx` (Node 20+). Ensure `@supabase/supabase-js` is installed where Node resolves modules (for example a small `package.json` + `npm install` under `/root/skills/supabase-reads/` or a parent directory).

**Pair with** the file wiki skill: `/root/skills/myself-wiki/SKILL.md` (markdown vault on this host — see that skill before publishing cards).

## Scripts

| Script | Purpose |
|--------|---------|
| `read-raw-sources.ts` `[kinds]` | JSON to stdout. **No arg or `all`:** full bundle (`plans`, `marked`, `wishes`, `skills`, `todos`, `wishlist_todos`, `invoices`, `mind_map`, `finance`). Otherwise comma-separated subset (e.g. `plans,wishes`). `invoices` returns `{ invoices, clients }`; `mind_map` returns `{ scenes, nodes }`; `finance` returns `{ accounts, transactions, budgets, investments }`. |
| `dismissals-pending.ts` | JSON `{ dismissals: [...] }` where `ingested === 0` |
| `dismissals-mark-ingested.ts` `<id>…` | Mark dismissal rows ingested |
| `publish-dashboard.ts` `<cards.json>` | JSON `{ "cards": [ … ] }` (max 9). Upserts by `id` or by **`slot`** (stable per user). Archives active rows not in the payload. **This is the only script that writes to Supabase** (table `dashboard_cards`). |

### Example invocations

```bash
npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts
npx tsx /root/skills/supabase-reads/scripts/read-raw-sources.ts plans,wishes,finance
npx tsx /root/skills/supabase-reads/scripts/publish-dashboard.ts /tmp/cards.json
```

## Ingest workflow (with file wiki)

Work through **`/root/skills/myself-wiki/SKILL.md`** first: update the markdown vault from raw evidence and your reasoning (Karpathy LLM-wiki style — compounding notes, not one-off dumps).

Then use **this** skill’s scripts:

1. Optional: `dismissals-pending.ts` → fold user verbs into the **file wiki** (not Postgres) → `dismissals-mark-ingested.ts` with processed ids.
2. **`read-raw-sources.ts`** (no args = full raw bundle) — load wishes (`learn`, `place`, `goal`) and cross-check activity: plans, marked, skills, todos, wishlist_todos, invoices (+ clients), mind map (scenes + life_nodes), finance (accounts, transactions, budgets, investments).
3. Build **≤9** dashboard cards: concise **eagle view** toward the user’s wishes — where they are, alignment vs behaviour, keep/stop/improve. **Not** the wiki; cards are short summaries for the app UI. Exactly one `kind: "heartbeat"`.
4. Each card should include evidence in **`sources`** (see app `SourceRef`). `wikiSlug` is **optional** metadata only (wiki is on this host, not loaded by the web app).
5. Prefer stable **`slot`**: lowercase `[a-z0-9_]{1,48}` so each run **updates** the same tiles (`${userId}_dash_${slot}` server-side).
6. Write `{ "cards": [...] }` to a temp file, then **`publish-dashboard.ts`** that path. **The app reads cards only from Supabase** (`dashboard_cards` via RLS); there is no stdout handoff. Optional one-line status on stdout is fine.

### Canonical `slot` names (eagle-view set)

| `slot` | Role | Typical `kind` |
|--------|------|----------------|
| `wishes_compass` | Wishes-first summary: all categories, where attention is going | `synthesis` |
| `alignment` | Evidence whether activity **matches or drifts** from stated wishes | `synthesis` or `lint` |
| `keep_doing` | 2–5 bullets: behaviours to **continue** (each tied to `sources` with clear `label`) | `synthesis` |
| `stop_doing` | 2–5 bullets: behaviours to **pull back** (evidence-backed, non-judgmental tone) | `synthesis` |
| `heartbeat` | Single pulse card: cadence, freshness, “what changed this ingest” | `heartbeat` |
| `signals` | Optional: notable clips, skills, or queries not covered above | `synthesis`, `gap`, or `query` |

## Tables (snake_case in Postgres)

**Read-only (raw context):** `plan_pages`, `marked_collections`, `marked_items`, `user_wishes`, `user_skills`, `todos`, `wishlist_todos`, `invoices`, `invoice_clients`, `mind_map_scenes`, `life_nodes`, `finance_accounts`, `finance_transactions`, `finance_budgets`, `finance_investments`

**Read + acknowledge:** `card_dismissals` (`ingested` flag)

**Write (agent only):** `dashboard_cards` — see app `PublishCardInput` / `publishDashboard`; include `slot` for stable upserts.

**RLS:** If a query returns “permission denied” or empty when the UI shows data, fix policies in Supabase — do not escalate to service role.

## Hard rules

- Never modify raw source tables.
- Never publish more than one `heartbeat` card.
- If you have no sources for a topic, surface a `gap` card instead of inventing a synthesis.
- Do NOT emit legacy `[CARD]` JSON to stdout expecting the server to parse it — persistence is **`publish-dashboard.ts`** only.
