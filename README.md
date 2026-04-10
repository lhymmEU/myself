[中文版](./README.zh-CN.md)

# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single interface — completely local, completely yours.

## Features

- **Mind Map** — Interactive visual map of your life. Add categories (Health, Career, Finance, etc.) and items. Drag, connect, and organize freely.
- **Smart Todos** — Automatically created from your mind map, no manual work needed.
- **Finance Terminal** — Personal finance tracker + market data powered by [OpenBB](https://github.com/OpenBB-finance/OpenBB). Stocks, crypto, economic indicators, and financial news.
- **Plans** — Rich text editor for jotting down ideas, plans, and notes.
- **Claw** — Built-in AI assistant that understands your dashboard data.
- **Invoice** — Bill your clients with ease.
- **Vault** — Manage your secrets on your local device.
- **Settings** — Configure API keys, preferences, and appearance from the UI. No `.env` files needed.

---

## Setup Guide

### Step 1 — Install Prerequisites

You need two things installed on your machine before you begin:

| Software | Required? | Version | Download |
|----------|-----------|---------|----------|
| **Node.js** | Yes | v20 or later | [nodejs.org](https://nodejs.org/) — choose the **LTS** version |
| **Git** | Yes | any | [git-scm.com](https://git-scm.com/) |
| **Python** | Optional | 3.9–3.12 | [python.org](https://www.python.org/) — only needed for finance market data |

**How to check if they're installed:**

```bash
node -v     # should print v20.x.x or higher
git --version
```

### Step 2 — Download the Project

Open a terminal (Terminal on Mac, Command Prompt or PowerShell on Windows) and run:

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
```

### Step 3 — Install & Build

**Option A: One-click setup (recommended)**

macOS / Linux:
```bash
./setup.sh
```

Windows (Command Prompt):
```
setup.bat
```

Windows (PowerShell):
```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

The script checks your environment, installs all dependencies, and builds the app.

**Option B: Manual**

```bash
npm install
```

### Step 4 — Start the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. That's it — the database is created automatically on first launch.

### Step 5 — Finance Market Data (optional)

The finance page has two modes: **Personal Finance** (works immediately, no setup) and **Market Intelligence** (needs OpenBB).

#### 5a. Install OpenBB

```bash
pip3 install "openbb[all]"
```

#### 5b. Start the OpenBB API

In a **separate terminal**, run:

```bash
openbb-api --host 127.0.0.1 --port 6900
```

Keep this terminal open while you use the finance features.

#### 5c. Configure Provider API Keys

Some market data modules require free API keys from data providers. Without the key, the module shows a message telling you which key is needed.

Go to **Settings → Finance Data Providers** to enter your keys. Each provider has a registration link right in the settings panel.

| Provider | What it unlocks | Free tier? |
|----------|----------------|------------|
| [BizToc](https://api.biztoc.com) | World news feed | Yes |
| [Benzinga](https://www.benzinga.com/apis) | Company news | Yes |
| [Financial Modeling Prep](https://financialmodelingprep.com) | ETF data, equity screener | Yes |
| [Tradier](https://developer.tradier.com) | Options chains | Yes (sandbox) |
| [Polygon.io](https://polygon.io) | Additional market data | Yes |
| [Alpha Vantage](https://www.alphavantage.co) | Stock & forex data | Yes |
| [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) | Federal Reserve economic data | Yes |

Modules that use free providers (Yahoo Finance, SEC, Federal Reserve) work without any API keys.

#### Summary: what's running

| Process | Command | Port | Purpose |
|---------|---------|------|---------|
| Next.js | `npm run dev` | 3000 | Dashboard |
| OpenBB *(optional)* | `openbb-api --host 127.0.0.1 --port 6900` | 6900 | Market data API |

---

## Agent API

The dashboard is agent-ready. All features are exposed as tools via the `/api/agent` endpoint:

```bash
# List all available tools
curl http://localhost:3000/api/agent

# Execute a tool
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"name": "createTodo", "arguments": {"title": "Buy groceries"}}'
```

Tools available across all modules (mind-map, todos, finance, plans, settings).

## Architecture

Every feature is a self-contained module under `lib/modules/<feature>/`:

```
schema.ts   — Drizzle ORM table definitions
actions.ts  — Data access functions (CRUD)
tools.ts    — Agent-callable tool definitions
types.ts    — TypeScript interfaces
events.ts   — Event bus event constants
index.ts    — Module registration
```

Core infrastructure (`lib/core/`):
- **Module Registry** — Auto-discovers and initializes modules
- **Tool Registry** — Registers agent-callable tools with Zod validation
- **Event Bus** — Typed pub/sub for cross-module communication
- **LLM Client** — OpenAI SDK wrapper for OpenRouter
- **DB** — SQLite + Drizzle ORM connection

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **shadcn/ui** + Tailwind CSS v4 + Lucide React
- **SQLite** via better-sqlite3 + Drizzle ORM (local, zero-config)
- **OpenRouter** for LLM integration (OpenAI SDK)
- **Recharts** for financial visualizations
- **[OpenBB](https://github.com/OpenBB-finance/OpenBB)** for market data (Python sidecar)

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and upcoming releases.

## License

[AGPL-3.0](./LICENSE)
