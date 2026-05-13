---
name: myself-supabase-wiki
description: >-
  Supabase-backed wiki ingest for OpenClaw: read/write wiki_pages, wiki_log_entries,
  dashboard_cards, card_dismissals, and raw sources (plans, marked, wishes, skills)
  using supabase-js as the authenticated user (RLS). Use with credentials supplied
  in the wiki-ingest message (delimited blocks), exported to env for the scripts below.
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
| `read-raw-sources.ts` | JSON to stdout: `plans`, `marked`, `wishes`, `skills` (optional arg: comma kinds or `all`) |
| `read-wiki-page.ts` `<slug>` | Markdown body to stdout |
| `write-wiki-page.ts` `<slug>` `<file.md>` | Upsert wiki page |
| `append-wiki-log.ts` `<text>` | Append one log line |
| `read-wiki-log.ts` `[tail=50]` | Recent log lines |
| `search-wiki.ts` `<query>` `[max]` | JSON `{ hits: [{ slug, excerpt }] }` |
| `list-wiki-slugs.ts` | JSON array of slugs |
| `dismissals-pending.ts` | JSON `{ dismissals: [...] }` where `ingested === 0` |
| `dismissals-mark-ingested.ts` `<id>…` | Mark dismissal rows ingested |
| `publish-dashboard.ts` `<cards.json>` | JSON file must be `{ "cards": [ … ] }` (max 9 cards); archives active cards not in the new set |

### Example invocations

```bash
npx tsx /root/skills/supabase-op/scripts/read-raw-sources.ts
npx tsx /root/skills/supabase-op/scripts/read-wiki-page.ts syntheses/example
npx tsx /root/skills/supabase-op/scripts/publish-dashboard.ts /tmp/cards.json
```

## Ingest workflow (matches dashboard preamble)

1. `dismissals-pending.ts` → fold user verbs into wiki → `dismissals-mark-ingested.ts`
2. `read-raw-sources.ts` → decide stale pages
3. Read/write wiki pages + `append-wiki-log.ts`
4. Build card list (≤9, exactly one `heartbeat`, every card has `wikiSlug`)
5. Write `/tmp/cards.json` then `publish-dashboard.ts /tmp/cards.json`
6. Print the **stdout dashboard JSON block** exactly as instructed in the main wiki-ingest message (`<<<MYSELF_DASHBOARD_JSON_*>>>`)

## Tables (snake_case in Postgres)

- `wiki_pages`: `user_id`, `slug`, `markdown`, `updated_at`
- `wiki_log_entries`: `id`, `user_id`, `body`, `created_at`
- `dashboard_cards`: see app `PublishCardInput` / `publishDashboard`
- `card_dismissals`: `id`, `user_id`, `card_id`, `verb`, `payload_json`, `created_at`, `ingested`
- Raw: `plan_pages`, `marked_collections`, `marked_items`, `user_wishes`, `user_skills`
