# Life Dashboard — Dev Setup

This guide is for developers who want to run the dashboard locally against their own Supabase project. End users should just visit the hosted instance — see [`README.md`](./README.md).

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org/) (pick the LTS).
- **Git** — [git-scm.com](https://git-scm.com/).
- A **Supabase project** ([supabase.com](https://supabase.com)) — free tier is fine. You will need the project URL, the anon key, and the database connection string.

## Setup

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
npm install
```

Create `.env.local` at the repo root:

```
DATABASE_URL=postgres://...                  # from Supabase → Project Settings → Database
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# For Resend-based invoice email (optional unless you exercise that flow):
RESEND_API_KEY=...
RESEND_FROM_EMAIL=invoices@yourdomain.com

# For the agent watcher JWTs (any long random string):
SUPABASE_JWT_SECRET=...                       # matches your Supabase project's JWT secret
```

Apply the SQL migrations in `drizzle/postgres/` to your Supabase database (Supabase SQL editor, `psql`, or `npm run db:migrate` with `DATABASE_URL` set).

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in via magic link to your email, then start using the dashboard against your own Supabase data.

## Pair an agent watcher (optional)

Wiki ingest and wish-expansion need a paired `openclaw` agent. On the machine you want the agent to live on:

```bash
# inside the repo:
npm run build:watcher    # bundles agent-watcher into agent-watcher/dist/myself-op.js
node agent-watcher/dist/myself-op.js init
node agent-watcher/dist/myself-op.js start
```

`init` prompts for the token printed by **Dashboard → Settings → Agent → Pair watcher**. `start` keeps a Supabase Realtime subscription open and runs `openclaw agent` whenever new events arrive.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack). |
| `npm run build` | Builds the agent-watcher bundle then the Next app. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run db:generate` | Diff schema → new migration in `drizzle/postgres/`. |
| `npm run db:migrate` | Apply pending migrations to the database in `DATABASE_URL`. |

## Troubleshooting

- **"Cannot connect to Supabase"** — Double-check `DATABASE_URL` and the two `NEXT_PUBLIC_SUPABASE_*` env vars. The connection string from Supabase → Project Settings → Database includes the password; URL-encode any special characters.
- **Magic-link email never arrives** — In Supabase → Auth → Providers → Email, make sure the email provider is enabled and `Site URL` is set to `http://localhost:3000` while developing.
- **"No agent watcher paired" toast** — Open Settings → Agent and click Pair watcher to issue a token, then run `myself-op.js init` with that token on the machine you want the agent on.
