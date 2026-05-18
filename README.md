# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single web app — your data, your rules.

---

## Try it online

1. Go to **https://lifedashboard.app** (or whichever URL the project owner posted in this repo's "About").
2. Click **Sign in** and enter your email. You'll get a magic-link login — no password needed.
3. You're in. Every row you create is scoped to your account by Postgres Row-Level Security; no other user can read it.

### What works in the online version

Mind Map, Todos, Plans, Invoice, Vault, Marked, Personal Finance, Settings, and a bento "wiki" dashboard fed by your paired agent. Pair an **agent watcher** on your own machine (see below) to unlock wish-expansion and wiki-ingest features that need an LLM.

---

## How the agent works

The dashboard does **not** ship an LLM. Instead it talks to an `openclaw` agent running on your own machine through a simple Supabase event queue:

1. The web app inserts rows into the `agent_events` table whenever something needs the agent — e.g. you click **Wiki ingest** or submit a wish to expand.
2. The **agent watcher** (`myself-op.js`) running on your machine subscribes to that queue via Supabase Realtime, picks up each event in order, and invokes `openclaw agent` locally.
3. `openclaw` reads the event payload, writes results back to your Supabase tables (`wiki_ingest_state`, `user_wishes`, dashboard cards), and the web UI revalidates.

There is no SSH, no inbound port, no persistent server-to-machine connection — the watcher polls Supabase outbound and that's it.

### Pair an agent watcher

On the machine you want the agent to run on:

```bash
# Install openclaw (the underlying agent CLI) if you don't already have it.
# Then download and run the watcher:
curl -O https://lifedashboard.app/myself-op.js
node myself-op.js init    # paste the token from Dashboard → Settings → Agent
node myself-op.js start   # leave this running
```

The dashboard issues a one-time JWT scoped to your `user_id`. The watcher uses it to read events and write results — Row-Level Security guarantees the watcher can only see your data.

---

## Architecture

```
lib/core/init.ts               # module registry + bootApp()
lib/core/event-bus.ts          # in-process event bus for cross-module signals
lib/core/{auth,mailer,route-helpers,types}.ts
lib/db/                        # Drizzle + postgres-js
lib/db/schema/postgres/        # one schema file per feature + agent.ts (event queue)
lib/supabase/                  # @supabase/ssr — auth + middleware
lib/modules/<feature>/         # per-feature module (see below)
lib/modules/agent/             # agent token issuance + emitEvent helper
agent-watcher/                 # myself-op.js — Supabase-Realtime queue drainer
agent-watcher/skill/           # SKILL.md + scripts/ that openclaw runs to update wikis + cards
```

**Data** always lives in **Supabase Postgres** (`DATABASE_URL`). **Auth** is always Supabase (email + password, magic link, OAuth — see login + Settings → Account security). Vault payloads are encrypted in the browser with the user's master password; the server only ever sees ciphertext.

CI runs **lint**, **typecheck**, and **`next build`** on every PR. ESLint restricts raw `fs` / `child_process` / `net` outside an explicit allowlist.

### Per-feature module layout

```
lib/modules/<feature>/
  index.ts        # FeatureModule manifest
  actions.ts      # Drizzle queries — every action takes (userId, …)
  types.ts        # Shared TS interfaces
  events.ts       # Cross-module event names
```

## Tech stack

- **Next.js 16** App Router (Turbopack)
- **Drizzle ORM** — Postgres (postgres-js) + Supabase
- **Supabase** — Postgres + Auth + Row-Level Security
- **shadcn/ui** + Tailwind CSS v4 + Lucide React
- **Recharts**, **BlockNote**, **Excalidraw**
- **Resend** for transactional email (invoice send)

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md).

## License

[AGPL-3.0](./LICENSE)
