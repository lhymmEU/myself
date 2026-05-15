---
name: myself-op
description: >-
  Push-ingest skill for the Life Dashboard. The user's web app pushes events
  (page upserts, marked items, wishes, dismissals, regen requests, bootstrap)
  to a Supabase queue. This skill drains the queue, integrates each item into
  a local file wiki, and regenerates the five dashboard insight cards when
  needed.
---

# myself-op

You are this user's agent. The web app pushes content to a queue; you
synthesize it into a wiki and publish dashboard cards. You are invoked once
per ingest cycle by a watcher daemon that lives on this machine.

## Layout

```
~/.myself-op/
├── config.json                  supabaseUrl, userId, token (DO NOT log)
└── wiki/
    ├── INDEX.md                 start here every session
    ├── profile/                 demographics + interests
    ├── wishes/{id}.md           one file per user wish
    ├── plans/{slug}.md          synthesised plan pages
    ├── references/{slug}.md     marked items / clipped highlights
    ├── syntheses/               cross-cutting analyses
    └── changelog.md             one line per ingest run
```

The skill itself is at `~/.myself-op/skill/` with scripts at `scripts/`.
Run them with `npx tsx ~/.myself-op/skill/scripts/<name>.ts`. All scripts
read `~/.myself-op/config.json` for credentials; you never see the token.

## Workflow (every invocation)

1. `npx tsx scripts/set-ingest-status.ts processing "ingest started"`
2. Ensure the wiki exists, then orient yourself:
   - `mkdir -p ~/.myself-op/wiki` (idempotent).
   - If `~/.myself-op/wiki/INDEX.md` is missing, create a minimal stub
     (`# Wiki — empty\n`) and treat this as a first-run cold start.
   - Read `~/.myself-op/wiki/INDEX.md`.
3. `npx tsx scripts/list-pending-events.ts` → JSON array of pending events,
   oldest first. If the array is empty AND no `regen.cards` was requested,
   skip ahead to step 7.
4. For each event, in order:
   1. If `payload` is present, use it; otherwise
      `npx tsx scripts/fetch-payload.ts <id>`.
   2. Dispatch on `event_type` (see below).
   3. `npx tsx scripts/mark-event.ts <id> done` (or
      `error "<message>"` on failure).
5. If **any** event touched content that influences the cards
   (page/marked/wish/dismissal/regen.cards), regenerate the five cards
   from the wiki and call
   `cat cards.json | npx tsx scripts/publish-cards.ts`.
6. Append one line to `wiki/changelog.md` summarizing what changed.
7. `npx tsx scripts/set-ingest-status.ts done ""`.

If the cycle fails partway through, leave the failing event with
`status=error` so the next invocation can retry the remaining work; also
`set-ingest-status.ts error "<message>"` so the dashboard surfaces it.

## Event types

| `event_type` | What the payload contains | Where it lands in the wiki |
|---|---|---|
| `page.upsert` | A plan page: `{ id, title, slug, content_markdown, folder_id, updated_at }` | `wiki/plans/{slug}.md` — synthesise (don't copy verbatim). |
| `marked.upsert` | A marked item or collection: `{ id, kind, title, url, body, tags, collection }` | `wiki/references/{slug}.md` — extract the why, not the full clip. |
| `wish.upsert` | `{ id, title, description, category, target_date, status }` | `wiki/wishes/{id}.md` — note the gap vs. current behaviour. |
| `dismissal.create` | `{ card_id, verb, note }` where verb is confirm/contradict/expand/archive/dismiss/pin/unpin | Fold the user's verb into `wiki/syntheses/dismissal-log.md` and any directly-cited wiki files. |
| `regen.cards` | `{}` | No wiki change — just regenerate cards. |
| `bootstrap.full` | `{}` (informational — server enumerated their content as many smaller events) | Marker only; the actual work arrives as individual page/marked/wish events. |

## The five cards

Always emit exactly five, with stable `ingestSlot` ids:

1. `current_status` — How far the user is from their stated goals overall.
2. `going_right` — Patterns of their recent behaviour that move them
   toward their wishes. Cite specific wiki files.
3. `deviating` — Patterns that work against their wishes. Be concrete and
   gentle. Cite.
4. `suggestions` — Two or three things they could change. Concrete,
   small, attached to wishes.
5. `heartbeat` — One- or two-line summary of what changed since the last
   run (read the new lines from `wiki/changelog.md`).

## Tile vs slide-in — emit BOTH

Each card has two render surfaces:

- **Tile** (the bento dashboard square): visible at a glance. Show a
  tight headline plus optional source chips. Use `summary` for this.
- **Slide-in sheet**: opens when the user clicks the tile. Has room for
  full prose / structured blocks. Use `body` (with `richMarkdown: true`)
  **or** `presentation.blocks` for this.

You **must** emit both:

- `summary` — 1-2 plain-text sentences (≤ 220 chars). What the user reads
  first. No Markdown, no bullets, no line breaks.
- One of:
  - `body` (Markdown long-form) + `richMarkdown: true`, **or**
  - `presentation.blocks` (structured layout — see block types below).

If you only emit `summary`, the slide-in will be empty. If you only emit
`body`/`presentation`, the tile clamps to 6 lines and looks truncated.
Both is the contract.

## Card payload shape

```json
{
  "cards": [
    {
      "slot": "current_status",
      "kind": "synthesis",
      "title": "Status — Learn Japanese",
      "summary": "On track for N4 in Q3. Vocabulary pace healthy; kanji still lagging by ~2 weeks.",
      "body": "## Progress to N4\n\n- Vocabulary: **820/1500** learned (target Apr 30).\n- Kanji: **190/300** (target Apr 14 — currently 14 days behind).\n- Listening: weekly NHK Easy, ~3 hrs/week.\n\n## What's driving the lag\nKanji practice slipped during the March travel block — see `plans/japan-trip.md`.",
      "richMarkdown": true,
      "sources": [
        { "kind": "wish", "id": "<wish uuid>", "label": "Learn Japanese" },
        { "kind": "plan", "id": "<plan uuid>", "range": "1:12" }
      ],
      "confidence": "strong"
    }
  ]
}
```

### Block types for `presentation.blocks`

When the slide-in deserves structure rather than prose, use blocks in
place of `body`:

- `{ "t": "heading", "text": "..." }`
- `{ "t": "paragraph", "text": "..." }`
- `{ "t": "bullets", "items": ["...", "..."] }`
- `{ "t": "metric", "label": "...", "value": "..." }`
- `{ "t": "callout", "tone": "info" | "warn" | "success", "text": "..." }`

**Source shape is strict.** Each `sources[]` item must be
`{ kind, id, label?, range? }`:

- `kind` — one of `"plan" | "marked" | "wish" | "skill"`.
- `id`   — the row UUID from the corresponding table (`plan_pages.id`,
  `marked_items.id`, `user_wishes.id`, etc. — these are the payload `id`
  fields you already received via `fetch-payload.ts`).
- `label` — optional human-readable name (rendered in the chip).
- `range` — optional `start:end` line hint.

Do **not** emit `{ path, lineFrom, lineTo }`; the dashboard will drop those
sources (or render them generically) because it can't deep-link to a
filesystem path. Cite the underlying database row instead.

Valid `slot` values: `current_status`, `going_right`, `deviating`,
`suggestions`, `heartbeat` (exactly one of each per run).

## Rules

- Never log, echo, or commit the token from `config.json`.
- Process events in queue order. The queue is serial; don't batch ahead.
- Be aggressive about marking events `done` once you've integrated them —
  duplicate processing is fine (handlers should be idempotent), but
  dropped events are not.
- When the user contradicts a card via `dismissal.create`, **trust them**.
  Update the relevant wiki file and re-derive the cards.
- The wiki grows. Don't overwrite a file unless the new payload supersedes
  the old one — merge instead.
