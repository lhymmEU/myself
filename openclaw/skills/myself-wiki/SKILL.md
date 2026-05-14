---
name: myself-wiki
description: >-
  File-based Karpathy-style LLM wiki on the OpenClaw host: incremental markdown
  vault for user profile, wishes, evidence, and syntheses. Companion to
  myself-supabase-reads (raw data + dashboard_cards in Supabase). Not stored
  in Postgres; the web app does not load these files.
---

# Myself — File wiki (OpenClaw host)

## Why this exists

This skill follows the **LLM Wiki** idea from Andrej Karpathy’s gist: [llm-wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Core idea:** instead of treating the model as a stateless summarizer, you maintain a **persistent, compounding** set of markdown notes — cross-linked, revised when new evidence arrives, with contradictions called out. The wiki becomes the long-horizon memory that supports a **precise user profile** and progress toward their stated wishes and goals.

## Vault location

Use a single root on this machine, stay consistent across sessions:

```text
/root/skills/myself-wiki/vault/
```

Document the path you chose in `vault/INDEX.md` the first time.

## Recommended layout

| Path | Purpose |
|------|---------|
| `INDEX.md` | Map of pages, last-updated notes, navigation |
| `profile/` | Stable facts, constraints, preferences (update in place) |
| `wishes/` | One file per wish category or id; link to evidence |
| `syntheses/` | Cross-domain “what is true now” pages (merge, don’t only append) |
| `open-questions.md` | Gaps when evidence is thin (pairs with `gap` dashboard cards) |
| `changelog.md` | Short one-line entries per ingest (replaces old Postgres wiki log) |

## Conventions

- **Paths:** slug-like segments (`syntheses/alignment-2026-05.md`). Prefer updating an existing page over spawning duplicates.
- **Frontmatter (optional):** `kind`, `confidence`, `freshness`, wish/goal ids — whatever helps you track staleness.
- **Citations:** reference Supabase entity ids from `read-raw-sources.ts` (plan ids, todo ids, invoice ids, etc.) so the file wiki stays traceable to raw rows.
- **Contradictions:** surface them explicitly (section or `contradictions.md`) and resolve or mark “unresolved” with dates.
- **User card verbs** (`card_dismissals`): when you read pending dismissals via the supabase-reads scripts, fold confirms/contradicts into the relevant wiki pages before marking ingested.

## Session loop

1. Read pending context: run **`/root/skills/supabase-reads/scripts/read-raw-sources.ts`** when you need the latest raw bundle (or subsets).
2. **Edit the vault** — integrate new facts, tighten syntheses, refresh wish pages.
3. Append one line to `changelog.md` summarizing the session.
4. **Hand off to supabase-reads:** build ≤9 dashboard cards from wishes + file wiki + raw bundle; run **`publish-dashboard.ts`** so rows land in Supabase — the dashboard UI reads **`dashboard_cards`** from the API, not agent stdout.

## Hard rules

- Do **not** create `wiki_pages` or `wiki_log_entries` in Supabase; those tables are not part of this product anymore.
- Keep tone evidence-based and non-judgmental on behavioural “stop doing” style notes (those belong in **dashboard cards** as concise UI copy; the wiki can hold richer rationale).
