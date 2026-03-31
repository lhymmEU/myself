# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single interface.

## Features

- **Mind Map** — Interactive visual map of your life. Add categories (Health, Career, Finance, etc.) and items. Drag, connect, and organize freely.
- **Smart Todos** — Automaticly created from your mind map, no manual work needed.
- **Finance Terminal** — Market data powered by [OpenBB](https://github.com/OpenBB-finance/OpenBB). Stocks, crypto, economic indicators, and financial news.
- **Plans** — Rich text editor for jotting down ideas, plans, and notes.
- **Invoice** - Bill your clients with ease.
- **Vault** - Manage your secrets on your local device.
- **Settings** — Configure API keys, preferences, and appearance from the UI. No `.env` files needed.

## Quick Start

### Prerequisites

- **Node.js v18+** — Download from [nodejs.org](https://nodejs.org/) (choose the LTS version).
- **Python 3.9–3.12** *(optional, for finance data)* — Needed to run the OpenBB market data sidecar.

### Option A: One-click setup (recommended)

**macOS / Linux:**

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
./setup.sh
```

**Windows:**

```
git clone https://github.com/lhymmEU/myself.git
cd myself
setup.bat
```

The setup script checks your Node.js installation, installs all dependencies, and builds the app.

### Option B: Manual setup

```bash
git clone https://github.com/lhymmEU/myself.git
cd myself
npm install
```

### Running the dashboard

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. The database is created automatically on first launch — no configuration required.

### Setting up finance data (optional)

The finance feature uses [OpenBB](https://github.com/OpenBB-finance/OpenBB) as a Python sidecar for market data. You only need to install it once:

```bash
pip3 install "openbb[all]"
```

Then start the OpenBB API server in a separate terminal whenever you want finance data:

```bash
openbb-api --host 127.0.0.1 --port 6900
```

| Process | Command | Port | Purpose |
|---------|---------|------|---------|
| Next.js | `npm run dev` | 3000 | Dashboard |
| OpenBB | `openbb-api --host 127.0.0.1 --port 6900` | 6900 | Market data API |

The OpenBB sidecar is **optional** — the rest of the dashboard works without it. If it's not running, the finance page shows setup instructions.

## Configuration

All configuration is managed through the in-app Settings page:

- **OpenRouter API Key** — Required for AI-powered todo generation. Get one at [openrouter.ai](https://openrouter.ai).
- **LLM Model** — Choose from Claude, GPT-4o, Gemini, Llama, etc.
- **OpenBB API URL** — Defaults to `http://localhost:6900`. Use the "Test Connection" button to verify.
- **Theme, accent color** — All configurable from the UI.

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

MIT
