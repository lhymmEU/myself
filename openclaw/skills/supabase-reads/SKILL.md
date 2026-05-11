---
name: myself-supabase-reads
description: >-
  Read-only Supabase access for OpenClaw and other remote agents against the
  Life Dashboard Postgres schema (wiki_pages, wiki_log_entries, and related
  tables). Use when the agent needs SQL-backed context beyond /api/agent tools.
---

# Myself — Supabase read bundle

## When to use this

- Prefer **`/api/agent`** on the Next.js host (via reverse SSH) for writes and
  packaged tools (`readRawSources`, `writeWikiPage`, `publishDashboard`, …).
- Use **these scripts** only for **read-only** exploration or batch reads from
  the same machine where the agent runs, with a **user JWT** so RLS applies.

## Environment (required)

| Variable | Meaning |
|----------|---------|
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | Same as `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key) |
| `MYSELF_SUPABASE_ACCESS_TOKEN` | Short-lived **user** access token (JWT) from a signed-in session |

**Never** set `SUPABASE_SERVICE_ROLE_KEY` on the SSH host.

## Scripts (from repo root)

```bash
npx tsx openclaw/skills/supabase-reads/scripts/list-wiki-slugs.ts
npx tsx openclaw/skills/supabase-reads/scripts/read-wiki-page.ts syntheses/example
```

## Identity

All rows are scoped by `user_id = auth.uid()`. The JWT must be for the same
account as the dashboard user so policies allow reads.
