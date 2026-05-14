---
name: myself-supabase-wiki
description: >-
  Supabase-backed wiki ingest for OpenClaw: read/write wiki_pages, wiki_log_entries,
  dashboard_cards, card_dismissals, and raw sources (plans, marked, wishes, skills,
  todos, wishlist todos, invoices, mind map) using supabase-js as the authenticated
  user (RLS). Use with credentials supplied in the wiki-ingest message (delimited
  blocks), exported to env for the scripts below.
---

# Myself — Supabase wiki ingest (OpenClaw)

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

Install the skill on the agent machine so TypeScript scripts live here:

```text
/root/skills/supabase-op/scripts/
```

(`SKILL.md` can sit alongside as `/root/skills/supabase-op/SKILL.md`.) Run scripts with `npx tsx` (Node 20+). Ensure `@supabase/supabase-js` is installed where Node resolves modules (for example a small `package.json` + `npm install` under `/root/skills/supabase-op/` or a parent directory).

## Scripts

| Script | Purpose |
|--------|---------|
| `read-raw-sources.ts` `[kinds]` | JSON to stdout. **No arg or `all`:** full bundle (`plans`, `marked`, `wishes`, `skills`, `todos`, `wishlist_todos`, `invoices`, `mind_map`). Otherwise comma-separated subset (e.g. `plans,wishes`). `invoices` returns `{ invoices, clients }`; `mind_map` returns `{ scenes, nodes }` (Postgres: `mind_map_scenes`, `life_nodes`). |
| `read-wiki-page.ts` `<slug>` | Markdown body to stdout |
| `write-wiki-page.ts` `<slug>` `<file.md>` | Upsert wiki page |
| `append-wiki-log.ts` `<text>` | Append one log line |
| `read-wiki-log.ts` `[tail=50]` | Recent log lines |
| `search-wiki.ts` `<query>` `[max]` | JSON `{ hits: [{ slug, excerpt }] }` |
| `list-wiki-slugs.ts` | JSON array of slugs |
| `dismissals-pending.ts` | JSON `{ dismissals: [...] }` where `ingested === 0` |
| `dismissals-mark-ingested.ts` `<id>…` | Mark dismissal rows ingested |
| `publish-dashboard.ts` `<cards.json>` | JSON `{ "cards": [ … ] }` (max 9). Upserts by `id` or by **`slot`** (stable per user). Archives active rows not in the payload. |

### Example invocations

```bash
npx tsx /root/skills/supabase-op/scripts/read-raw-sources.ts
npx tsx /root/skills/supabase-op/scripts/read-raw-sources.ts plans,wishes
npx tsx /root/skills/supabase-op/scripts/read-wiki-page.ts syntheses/example
npx tsx /root/skills/supabase-op/scripts/publish-dashboard.ts /tmp/cards.json
```

## Ingest workflow (matches dashboard preamble)

1. `dismissals-pending.ts` → fold user verbs into wiki → `dismissals-mark-ingested.ts`
2. **`read-raw-sources.ts`** (no args = full raw bundle) → you must reason from **all** `user_wishes` rows (`learn`, `place`, `goal`) plus activity: `plan_pages`, `marked_*`, `user_skills`, `todos`, `wishlist_todos`, `invoices`, `mind_map` — then decide stale/missing wiki syntheses.
3. Read/write wiki pages + `append-wiki-log.ts`
4. Build **≤9** dashboard cards (exactly one `kind: "heartbeat"`). **Every card** must include:
   - `wikiSlug` (non-null string)
   - **`slot`**: lowercase `[a-z0-9_]{1,48}` — **required** unless you intentionally reuse a legacy explicit `id`. Slots map server-side to stable row ids so each ingest **updates** the same tiles instead of minting random ids.
5. Write `/tmp/cards.json` then `publish-dashboard.ts /tmp/cards.json`
6. Print the **stdout dashboard JSON block** (`<<<MYSELF_DASHBOARD_JSON_*>>>`) with the **same** `cards` array as publish.

### Canonical `slot` names (eagle-view set)

Use these first so the UI can order and label tiles:

| `slot` | Role | Typical `kind` |
|--------|------|----------------|
| `wishes_compass` | Wishes-first summary: all categories, where attention is going | `synthesis` |
| `alignment` | Evidence whether activity (plans, marked, todos, invoices, mind map, skills) **matches or drifts** from stated wishes | `synthesis` or `lint` |
| `keep_doing` | 2–5 bullets: behaviours to **continue** (each tied to sources in `sources` with clear `label`) | `synthesis` |
| `stop_doing` | 2–5 bullets: behaviours to **pull back** (evidence-backed, non-judgmental tone) | `synthesis` |
| `heartbeat` | Single pulse card: cadence, freshness, “what changed this ingest” | `heartbeat` |
| `signals` | Optional: notable clips, skills, or queries not covered above | `synthesis`, `gap`, or `query` |

You may add more slots (same pattern) for remaining tiles; prefer reusing stable slots over inventing one-off ids.

## Tables (snake_case in Postgres)

- `wiki_pages`: `user_id`, `slug`, `markdown`, `updated_at`
- `wiki_log_entries`: `id`, `user_id`, `body`, `created_at`
- `dashboard_cards`: see app `PublishCardInput` / `publishDashboard` — include `slot` for stable upserts
- `card_dismissals`: `id`, `user_id`, `card_id`, `verb`, `payload_json`, `created_at`, `ingested`
- Raw: `plan_pages`, `marked_collections`, `marked_items`, `user_wishes`, `user_skills`, `todos`, `wishlist_todos`, `invoices`, `invoice_clients`, `mind_map_scenes`, `life_nodes`

**RLS:** Ingest only reads raw tables the app already exposes to `authenticated`. If a query returns “permission denied” or empty when the UI shows data, fix policies in Supabase — do not escalate to service role.
