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
- `<<<MYSELF_SUPABASE_REFRESH_TOKEN_START>>>` … `<<<MYSELF_SUPABASE_REFRESH_TOKEN_END>>>` — user refresh token

**Before running any script**, export them (same names the scripts expect):

```bash
export SUPABASE_URL='<paste URL line>'
export SUPABASE_ANON_KEY='<paste anon key line>'
export SUPABASE_REFRESH_TOKEN='<paste refresh token line>'
```

Never log these values, commit them to git, or paste them into unrelated services.

In the dashboard, save the refresh token under **Settings → OpenClaw / wiki ingest** using **Get from session** (reads your Supabase auth cookie in this browser) or manual paste.

## How auth works

Scripts call `refreshSession` with `SUPABASE_REFRESH_TOKEN` so PostgREST requests run as **your** user (`auth.uid()`). Never use `SUPABASE_SERVICE_ROLE_KEY` on the OpenClaw host.

## Repo layout

From the **repository root** (`myself` clone on the OpenClaw machine):

```text
openclaw/skills/supabase-reads/scripts/
```

Run with `npx tsx` (Node 20+).

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
npx tsx openclaw/skills/supabase-reads/scripts/read-raw-sources.ts
npx tsx openclaw/skills/supabase-reads/scripts/read-wiki-page.ts syntheses/example
npx tsx openclaw/skills/supabase-reads/scripts/publish-dashboard.ts /tmp/cards.json
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
