# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single interface.

## Features

- **Mind Map** — Interactive visual map of your life. Add categories (Health, Career, Finance, etc.) and items. Drag, connect, and organize freely.
- **Smart Todos** — Manual task management with AI-powered auto-generation via OpenRouter. The LLM analyzes your mind map, goals, habits, and finances to suggest actionable tasks.
- **Finance Tracker** — Track income, expenses, and investments. Bar and pie charts. Budget tracking with progress bars.
- **Plans** — Rich text editor for jotting down ideas, plans, and notes.
- **Habits** — Daily/weekly habit tracking with streak counters and a contribution heatmap.
- **Goals** — Long-term goal tracking with milestones, progress rings, and deadline countdown.
- **Settings** — Configure API keys, preferences, and appearance from the UI. No `.env` files needed.

## Quick Start

### Prerequisites

You need **Node.js v18 or later** installed on your computer.

- **Don't have Node.js?** Download it from [nodejs.org](https://nodejs.org/) — choose the **LTS** version and follow the installer.

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

## Configuration

All configuration is managed through the in-app Settings page:

- **OpenRouter API Key** — Required for AI-powered todo generation. Get one at [openrouter.ai](https://openrouter.ai).
- **LLM Model** — Choose from Claude, GPT-4o, Gemini, Llama, etc.
- **Currency, theme, accent color** — All configurable from the UI.

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

25 tools available across all modules (mind-map, todos, finance, plans, habits, goals, settings).

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

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for planned features and upcoming releases.

## License

MIT
