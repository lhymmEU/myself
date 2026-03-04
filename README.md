# Life Dashboard

A modular, agent-ready personal life management dashboard. Manage every aspect of your life from a single interface.

## Features

- **Mind Map** — Interactive visual map of your life (React Flow). Add categories (Health, Career, Finance, etc.) and items. Drag, connect, and organize freely.
- **Smart Todos** — Manual task management with AI-powered auto-generation via OpenRouter. The LLM analyzes your mind map, goals, habits, and finances to suggest actionable tasks.
- **Finance Tracker** — Track income, expenses, and investments. Bar and pie charts. Budget tracking with progress bars.
- **Plans** — Notion-like rich text editor (TipTap) for jotting down ideas, plans, and notes.
- **Habits** — Daily/weekly habit tracking with streak counters and a GitHub-style contribution heatmap.
- **Goals** — Long-term goal tracking with milestones, progress rings, and deadline countdown.
- **Settings** — Configure API keys, preferences, and appearance from the UI. No `.env` files needed.

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **shadcn/ui** + Tailwind CSS v4 + Lucide React
- **SQLite** via better-sqlite3 + Drizzle ORM (local, zero-config)
- **OpenRouter** for LLM integration (OpenAI SDK)
- **React Flow** (@xyflow/react) for the mind map
- **TipTap** for the rich text editor
- **Recharts** for financial visualizations

## Getting Started

```bash
git clone <repo-url>
cd myself
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The database is auto-created on first run.

## Configuration

All configuration is managed through the in-app Settings page (`/dashboard/settings`):

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

## License

MIT
