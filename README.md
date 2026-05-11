[中文版](./README.zh-CN.md)

# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single interface — your data, your rules.

There are **two ways to use it**:

| | Try it online | Install locally |
|---|---|---|
| **Setup time** | 30 seconds | 5–10 minutes |
| **Sign up?** | Email magic link | None — single user |
| **Database** | Supabase Postgres (each user isolated) | SQLite file in `data/` |
| **AI assistant (Claw)** | Connect your own cloud server or lobster | Built-in OpenRouter LLM |
| **SSH terminal in Claw** | On — browser SSH for any cloud VM (no install) | On — direct SSH |
| **Live market data (OpenBB)** | Off — local install only | On with OpenBB sidecar |
| **Email (invoices)** | Resend (built-in) | Your SMTP (nodemailer) |
| **Cost** | Free for the demo URL | Free, runs on your hardware |

> **TL;DR.** Use the online version to kick the tyres. When you're ready to pipe your real data, machines, or money through it, install locally.

---

## Try it online

1. Go to **https://lifedashboard.app** (or whichever URL the project owner posted in this repo's "About").
2. Click **Sign in** and enter your email. You'll get a magic-link login — no password needed.
3. You're in. Every row you create is scoped to your account by Postgres Row-Level Security; no other user can read it.

### What works in the online version
- Mind Map, Todos, Plans, Invoice, Vault, Marked
- Personal Finance (budgets, transactions, holdings)
- Settings (theme, language, invoice profile, vault path)
- Claw chat **once you pair a local lobster** (see below)

### What is **off by default** in the online version
- **Live market data** (OpenBB sidecar binds to `127.0.0.1:6900` — local install only).
- **Bundled LLM access** — the cloud build never ships an OpenRouter key. Connect your own server.
- **Local file picker** in Claw (`/api/claw/read-local-file`).

### Connecting Claw to your machines (cloud)

The cloud version offers two transports for SSH-based Claw connections. Pick whichever matches where the machine lives.

#### A. Cloud server — direct browser SSH (zero install) — **default**

For VMs with a public IP (AWS, Aliyun, Tencent, Hetzner, DigitalOcean, …):

1. In Claw, click **Add cloud server**.
2. Enter the host, port, username, and either a password or SSH private key.
3. Credentials are encrypted with your vault master password **in your browser** before they touch the server. Only you can decrypt them.
4. Click **Connect**. A WASM SSH client (`gossh-wasm`) runs in your tab and tunnels through a Cloudflare Worker that does nothing but bridge raw TCP — it cannot read your traffic. SSH key exchange, host-key verification, and auth all run between your browser and your `sshd`.

Nothing to install on the server. The first connect surfaces the host-key fingerprint for trust-on-first-use; subsequent connects fail closed if the key changes unexpectedly.

#### B. Home machine — `lobsterd` agent (NAT-traversal)

For laptops, NAS boxes, or anything behind home NAT that can't accept inbound SSH:

```bash
# On the machine you want Claw to reach:
git clone https://github.com/lhymmEU/myself.git
cd myself
npm install
npx lobsterd pair 123456     # 6-digit code from "Add lobster" in the cloud UI
npx lobsterd serve           # leave this running
```

`lobsterd` outbound-connects to the same Cloudflare Worker; the browser does too. The Worker only sees ciphertext — both peers carry an end-to-end NaCl/X25519 session.

See [`lobsterd/README.md`](./lobsterd/README.md) for the home-machine flow and [`workers/relay/README.md`](./workers/relay/README.md) for the relay protocol (both transports).

---

## Install locally

The local install is the original single-user experience. Everything runs on your machine, no cloud, no signup.

### Step 1 — Install prerequisites

| Software | Required? | Version | Download |
|----------|-----------|---------|----------|
| **Node.js** | Yes | v20 or later | [nodejs.org](https://nodejs.org/) — pick **LTS** |
| **Git** | Yes | any | [git-scm.com](https://git-scm.com/) |
| **Python** | Optional | 3.9–3.12 | [python.org](https://www.python.org/) — only for OpenBB market data |

```bash
node -v
git --version
```

### Step 2 — Clone and install

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
./setup.sh                       # macOS/Linux
# Windows: setup.bat   (or)   powershell -ExecutionPolicy Bypass -File setup.ps1
```

Or manually:
```bash
npm install
node -e "require('better-sqlite3')(':memory:').close()"
```

If the `better-sqlite3` smoke check fails:
- **Windows**: install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) ("Desktop development with C++").
- **macOS**: `xcode-select --install`.
- **Linux**: `apt install build-essential python3` or your distro's equivalent.

### Step 3 — Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SQLite databases (`data/dashboard.db`, `data/vault.db`) are created on first launch.

### Step 4 — Live market data (optional)

```bash
pip3 install "openbb[all]"
openbb-api --host 127.0.0.1 --port 6900   # leave this running
```

Then go to **Settings → OpenBB** in the app to confirm host/port. Some providers want a free API key — paste them under **Settings → Finance Data Providers**.

For the full step-by-step install, see [`INSTALL.md`](./INSTALL.md). For a tour of every feature, see [`USER_MANUAL.md`](./USER_MANUAL.md).

---

## Architecture (one data plane, capability flags)

**Data** always lives in **Supabase Postgres** (`DATABASE_URL`). **Auth** is always Supabase (email + password, magic link, OAuth — see login + Settings → Account security).

```
DEPLOYMENT_MODE=local   # default — ssh2, nodemailer, OpenBB, OpenRouter LLM (optional)
DEPLOYMENT_MODE=cloud   # hosted-style — Resend, lobsterd relay, browser crypto vault, no bundled LLM
```

Capability differences live in [`lib/core/runtime.ts`](./lib/core/runtime.ts). Feature modules use `availableIn` so the registry can skip features that need a local capability.

```
lib/core/runtime.ts            # MODE, isLocal(), isCloud(), capability layer
lib/db/                        # Drizzle + postgres-js
lib/db/schema/postgres/        # Drizzle schema + drizzle/postgres SQL migrations
lib/supabase/                  # @supabase/ssr — auth + middleware
lib/core/mailer.ts             # Nodemailer (local) | Resend (cloud)
lib/modules/claw/transport-ssh.ts    # Local SSH (ssh2)
lib/modules/claw/transport-relay.ts  # Cloud lobsterd relay client (home-NAT)
lib/modules/claw/transport-edge.ts   # Cloud browser-WASM SSH (gossh-wasm) for cloud VMs
workers/relay/                 # Cloudflare Worker — /pair (lobsterd) and /dial (edge SSH)
lobsterd/                      # Optional home-NAT agent daemon for cloud users
public/wasm/                   # Vendored gossh-wasm + wasm_exec.js
openclaw/skills/supabase-reads/ # Remote-agent read bundle (SKILL.md + scripts)
```

CI runs **lint**, **typecheck**, and **`next build`** on every PR. ESLint restricts raw `fs` / `child_process` / `net` outside an explicit allowlist.

### Per-feature module layout

```
lib/modules/<feature>/
  index.ts        # FeatureModule manifest with availableIn: ['local','cloud']
  actions.ts      # Drizzle queries — every action takes (userId, …)
  types.ts        # Shared TS interfaces
  events.ts       # Cross-module event names
```

## Tech stack

- **Next.js 16** App Router (Turbopack)
- **Drizzle ORM** — Postgres (postgres-js) + Supabase
- **Supabase** — Postgres + Auth + Row-Level Security
- **shadcn/ui** + Tailwind CSS v4 + Lucide React
- **Recharts**, **xterm.js**, **BlockNote**, **Excalidraw**
- **OpenRouter** via OpenAI SDK (local mode only — cloud users connect their own lobster)
- **OpenBB** Python sidecar for market intelligence (local mode only)
- **Cloudflare Workers + Durable Objects** for the encrypted lobster relay (cloud mode)

## OpenClaw and Supabase

Remote **openclaw** talks to your data **directly via Supabase** (anon key + your refresh session) using the bundle [`openclaw/skills/supabase-reads/`](./openclaw/skills/supabase-reads/) (`SKILL.md` + `scripts/`). On each wiki ingest, the dashboard sends `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and your saved refresh token in the SSH job message (see the wiki preamble). Save the refresh token under **Dashboard → Settings → OpenClaw / wiki ingest** (paste or **Get from session**); the server encrypts it with `MYSELF_OPENCLAW_TOKEN_KEY`. Never use the service-role key on the SSH host.

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md).

## License

[AGPL-3.0](./LICENSE)
