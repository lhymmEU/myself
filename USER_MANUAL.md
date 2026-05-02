[中文版](./USER_MANUAL.zh-CN.md)

# Life Dashboard — User Manual

A guided tour of every page inside the dashboard. The manual is organised in the same order as the left sidebar so you can read it with the app open beside you.

If you have not installed the dashboard yet, start with **[INSTALL.md](./INSTALL.md)** for the local install or with **[README.md](./README.md)** for the hosted version.

> **Cloud vs local.** The dashboard ships in two modes from the same codebase: a hosted "try-it-online" version on Vercel + Supabase, and a single-user local install backed by SQLite. Sections marked with the **🖥 Local install only** badge below are disabled in the hosted version; everything else works in both modes. See [`README.md`](./README.md) for the full feature matrix.

---

## The dashboard layout

When you open `http://localhost:3000`, you land on the dashboard home page. The layout has three parts that stay visible everywhere:

- **Left sidebar** — top-level navigation. Click the chevron at the bottom to collapse it into icons. The "Myself" group (Mind Map, Todos, Finance, Plans, Invoice, Vault, Marked) expands automatically when you are on one of those pages.
- **Top header** — shows the page title and a few global controls (theme toggle, language switch, etc.).
- **Main area** — the actual page content.

In the **local install**, your data lives in `data/dashboard.db` and `data/vault.db` on your own machine — nothing is uploaded. In the **hosted version**, your rows are stored in Supabase Postgres and isolated to your account by Row-Level Security; the vault payload is encrypted client-side before it ever reaches the server.

---

## Dashboard (home)

**What it is.** A "game-style" overview that pulls a few widgets together so you can glance at your day in one place.

**What you see.**

- **Wishlist** at the top — quick add for things you want.
- **User Panel** with a 2D pixel character — every skill you add equips a matching accessory (glasses for programming, palette for design, headphones for music, sword for sport, briefcase for business, badge for anything else). Skill level controls the accessory color (gray → blue → gold), and a row of dots under the feet tracks total skills.
- **Todo preview** — the next few open todos from the Todos page.
- **Claw panel** — a compact chat surface for the built-in AI assistant. Its pixel lobster equips an accessory for each installed Claw skill, picked by the skill's `metadata.type` (or a keyword match on its name/description). Adding a skill plays a sparkle; removing one plays a poof.

**Tips.**

- Both pixel characters keep the same color pickers as before — open the palette icon on each panel to recolor skin/hair/clothes (human) or shell/belly/eye (lobster).
- Anything you add from the wishlist or claw panel here syncs with the full pages — there is only one underlying database.

---

## Mind Map

**What it is.** A free-form visual map of your life. You create **categories** (Health, Career, Finance, Relationships, etc.), drop **items** inside them, and drag connections between things.

**Core actions.**

- Add a category or item from the side panel.
- Drag nodes around the canvas; connect them by dragging from one edge to another.
- Use the mode toggle at the top to switch between the freeform **mind-map canvas**, the **Excalidraw canvas** (sketch-style drawing) and the **product canvas** (structured product-discovery layout with Demand / Feature / Stakeholder / User panels in `components/mind-map/panels/`).
- Items you add automatically generate matching todos on the Todos page.

**Tips.**

- Use categories liberally — they double as filters everywhere else.
- The Excalidraw mode is great for quick whiteboarding. The product canvas is great when you want to think about a product or project as a single discoverable unit.

---

## Todos

**What it is.** A simple checklist that is fed by your mind map. You can also add free-form todos directly here.

**Core actions.**

- Click the checkbox to mark a todo done.
- Add a todo from the input at the top.
- Delete a todo with the trash icon.
- Edit a todo's title inline by clicking the text.

**Tips.**

- The Dashboard home page shows the next few open items from this list — keep them tidy and the home page stays useful.

---

## Finance

The Finance page has **two modes**, switchable from a tab at the top.

### Personal Finance

Works immediately, no setup required. Stored in your local database.

- **Budget view** — set monthly budgets per category and see how much you have left.
- **Transaction list** — log income and expenses; filter and search.
- **Investment portfolio** — track holdings (manually entered or imported).

### Market Intelligence  🖥 Local install only

Live market data via the optional OpenBB sidecar (see `INSTALL.md` Step 5). When OpenBB is not running, the page shows a connection banner instead of widgets. **In the hosted version this tab is hidden** — OpenBB binds to `127.0.0.1:6900` on your own machine, so it can't be reached from a serverless cloud. Run the local install if you want it.

The page is organised as a customizable grid of widgets:

- **Overview** — a summary of indices, top movers, etc.
- **Equity** — quotes, charts, screener results.
- **Crypto** — coin quotes, market caps.
- **Economy** — macro indicators, treasury rates, S&P 500 multiples, congressional trades.
- **News** — financial news feed.
- Specialty widgets: ETF, forex, derivatives, fixed income, commodities, regulators, quantitative, technical (see `components/finance/market/widgets/`).

Click the **Customize** drawer to choose which widgets appear and in what order. The **search input** at the top lets you query a specific symbol.

**Tips.**

- Modules backed by Yahoo Finance, the SEC, and the Federal Reserve work without any API keys. Other providers need a free key — the widget tells you which one.
- The **Ask Claw** button on this page sends the current data context into the AI assistant so it can answer questions about what you are looking at.

---

## Plans

**What it is.** A rich-text notebook. Multiple pages, each one a [BlockNote](https://www.blocknotejs.org/) document with headings, lists, code blocks, tables, embeds, and slash-command formatting.

**Core actions.**

- The **page list** on the left lets you add, rename, reorder, and delete pages.
- Type `/` inside the editor to open the block menu (heading, list, table, image, etc.).
- The **export / import bar** at the top exports the current page to **DOCX** (via `@blocknote/xl-docx-exporter`) or **PDF** (via `jspdf` + `html2canvas`), and imports DOCX files via `mammoth`.
- A small **Claw** affordance is embedded so you can ask the assistant for help while writing.

**Tips.**

- Plans pages are great for long-form notes. Keep todos in **Todos** and quick scratch in the wishlist.

---

## Invoice

**What it is.** A self-contained invoicing tool for freelancers — manage clients, build invoices, sign them, and export PDF.

**Core actions.**

- **Client manager** — add and edit clients (name, email, address, default tax/currency).
- **Invoice editor** — line items, quantities, rates, tax, notes, due date.
- **Invoice list** — filter by status (draft, sent, paid).
- **Invoice preview** — see the rendered invoice exactly as it will be exported.
- **Signature manager** — capture a hand-drawn signature with the trackpad / mouse (`signature_pad`) and reuse it on every invoice.
- Export to PDF from the preview.

**Tips.**

- Configure your business name, logo, default tax rate, and bank details once in **Settings → Invoice**.

---

## Vault

**What it is.** An encrypted password / secret store. In the **local install** it's a tiny offline Bitwarden that lives in `data/vault.db`. In the **hosted version** the encryption happens in your browser — the server only ever sees ciphertext + nonce — and the rows live in Postgres scoped to your account.

**Core actions.**

- **First time:** create the vault by setting a master password. Treat this password like a real password — there is no recovery, by design.
- **Unlock:** enter your master password each time you open the page (or after the timeout configured in Vault settings).
- **Add secret** — title, username, password, URL, notes.
- **Secret list** — search, copy a value to clipboard with one click, edit, delete.
- **Vault preview** — a compact read-only view embedded elsewhere.
- **Vault settings** — change master password, set auto-lock timeout, wipe vault.

**How the encryption works (plain language).** When you set a master password, the app derives an encryption key from it using **scrypt**. Your secrets are encrypted with **XChaCha20-Poly1305** (a modern authenticated cipher). A separate **SHA3-256** hash of the derived key is stored so the app can tell whether a password attempt is correct without ever storing the password itself. All of this is in `lib/modules/vault/crypto.ts`. The implications:

- The encrypted database (`data/vault.db`) is useless to anyone who does not know your master password.
- If you forget the master password, your secrets are gone. Back up the database to a safe place if you are worried.

---

## Marked

**What it is.** A bookmark / collection manager. Save links, snippets, or images, group them into collections, and export shareable cards.

**Core actions.**

- **Collection list** — add a collection, rename, delete.
- **Add item** — title, URL, description, image, tags. Items show up in a card list.
- **Item card** — open the source link, edit, copy, delete.
- **Share card preview / renderer** — generate a polished image card for any item (handy for social sharing). Uses `html-to-image` under the hood.

**Tips.**

- Use Marked for "I want to remember this thing later" without polluting your todos or plans.

---

## Claw (AI assistant)

**What it is.** The dashboard's built-in agent. It can chat with you, run tools that read and write your dashboard data (todos, finance, plans, settings, etc.), execute CLI tools, and host its own panels.

> **Cloud users:** Claw doesn't ship a built-in LLM in the hosted version. Instead, you pair your own machine ("lobster") via `npx lobsterd pair <code>` and Claw routes everything through it over an end-to-end encrypted relay. See [`README.md`](./README.md#connecting-your-own-lobster-cloud-claw) for the pairing flow.

The Claw page has a basic chat **DM panel** and a much richer **advanced view** with sub-panels for everything Claw can do.

**DM panel (chat).**

- **Smart input** with template popovers, category chips, and spotlight pills for quick prompts.
- **Message thread** with markdown / generative response cards.
- **Session list** — start a new conversation or jump back into an old one.
- **Tool approval cards** — when Claw wants to run a tool that modifies your data (e.g. create a todo), it asks for one-tap approval first.
- **Cron panel** — schedule prompts to run automatically on a recurring basis.
- **Action shelf** — your saved one-shot prompts.

**Advanced view sub-panels.**

- **Status panel** — shows whether the agent is connected and which model is in use.
- **Memories panel** — long-lived facts the agent has stored about you.
- **Sessions panel** — full session history with rename / delete / pin.
- **Channels panel** — chat channels (e.g. one per project).
- **Skills marketplace + Skill editor** — install or hand-write skills (small reusable capabilities).
- **Soul editor** — edit the agent's persona / system prompt.
- **CLI tools panel** — register external command-line tools the agent is allowed to call.
- **Public APIs panel** — register HTTP endpoints the agent is allowed to call.
- **Files panel** — files attached to the current session.
- **Code editor** + **JSON form editor** — edit skill code and config inline.
- **Config editor** — connection settings (model, API key endpoint).
- **Connection form** — quickly switch between providers.
- **Gateway control** — enable/disable the local agent gateway.
- **Logs viewer** — debug what the agent did and when.
- **Terminal**  🖥 Local install only — an embedded `xterm.js` terminal for issuing shell commands the agent can see. Hidden in the hosted version because Vercel cannot keep long-lived SSH shells open; pair a lobster instead and SSH from your own machine.

**Local install — you need an API key first.** Go to **Settings → Claw Access** and paste your OpenRouter API key (the dashboard talks to OpenRouter using the OpenAI SDK). Until you do, Claw responses will fail with an auth error.

**Hosted version — pair a lobster instead.** The cloud build ships no LLM credentials. Click **Add lobster** in the Claw page, copy the 6-digit code, then on your own machine run `npx lobsterd pair <code> && npx lobsterd serve`. From then on, the cloud UI talks to your local agent over an encrypted relay.

**Tips.**

- Start in the DM panel for everyday chat. Drop into the advanced view when you want to install a skill or wire up a CLI tool.
- Tool calls go through approval by default. Set the trust level per tool in Claw Access if you want certain tools to run automatically.

---

## Settings

The settings page is divided into tabs:

- **Appearance** — light / dark / system theme, language (English / 简体中文), accent color.
- **Finance Display** — pick which currency you see, decimal precision, default time range.
- **Finance Data Providers**  🖥 Local install only — paste API keys for BizToc, Benzinga, Financial Modeling Prep, Tradier, Polygon.io, Alpha Vantage, FRED. Each row links to the provider's free signup page. The hosted version doesn't show this section because OpenBB doesn't run on Vercel.
- **OpenBB**  🖥 Local install only — host and port for your local OpenBB API (defaults to `127.0.0.1:6900`). Hidden in the hosted version.
- **Invoice** — your business name, logo, address, tax rate, currency, payment details. These pre-fill every new invoice.
- **Claw Access**  🖥 Local install only — OpenRouter API key, model selection, per-tool approval defaults. The hosted version doesn't ship a bundled LLM, so this tab is hidden — pair a lobster from the Claw page instead.
- **Data Management** — export everything to JSON, import a previous export, or wipe the database.

**Tips.**

- The dashboard never reads from a `.env` file. Everything you would normally put in environment variables lives here in Settings.
- After changing the OpenRouter key or OpenBB port, no restart is needed — the change applies immediately.

---

## Where your data lives

### Local install

Everything is on your machine, in two SQLite files:

| File | What's in it |
|------|--------------|
| `data/dashboard.db` | Mind map, todos, plans, invoices, marked, settings, finance, claw |
| `data/vault.db` | Encrypted vault secrets only |

To **back up**: copy both files (and the `-shm` / `-wal` companion files) somewhere safe.

To **wipe everything**: stop the dashboard (`Ctrl+C` in the terminal), delete the `data/` folder, and start again with `npm run dev`. Fresh databases will be created.

To **migrate to another machine**: copy the entire project folder, including `data/`, to the new machine and run `npm install && npm run dev`.

### Hosted version

Your data lives in Supabase Postgres, partitioned per user by `user_id` and enforced by Row-Level Security policies (`auth.uid() = user_id`). Vault secrets are encrypted in your browser before they're sent — the server only sees ciphertext + nonce, so even a database leak wouldn't expose them.

To **export everything**: use **Settings → Data Management → Export** for a JSON snapshot you can re-import locally or back into another cloud account.

To **delete your account**: also under **Settings → Data Management**. This drops every row scoped to your `user_id` from every table.

---

## Power users — the agent API

Every feature is also exposed as a JSON tool over HTTP at `/api/agent`. This makes it easy to wire the dashboard into your own scripts, browser extensions, or external AI agents.

```bash
# Local install — list every tool the dashboard exposes
curl http://localhost:3000/api/agent

# Run a specific tool
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{"name": "createTodo", "arguments": {"title": "Buy groceries"}}'
```

In the hosted version the same endpoint is auth-gated to the calling user — pass your Supabase access token as a `Bearer` header.

See [README.md](./README.md) for a deeper architectural overview.

---

## Getting help

- Re-read [INSTALL.md](./INSTALL.md) for environment / setup issues.
- Read [README.md](./README.md) for tech-stack and architecture details.
- Open an issue on GitHub if something is broken or unclear in this manual.
