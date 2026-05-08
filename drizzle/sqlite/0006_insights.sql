-- Bento dashboard insight cache + user-action audit. Mirrors data/wiki/dashboard.json
-- so the bento UI renders fast without round-tripping to openclaw on every read.

CREATE TABLE IF NOT EXISTS dashboard_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  hue INTEGER NOT NULL DEFAULT 210,
  freshness INTEGER NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'thin',
  sources_json TEXT NOT NULL DEFAULT '[]',
  wiki_slug TEXT,
  pinned_goal_id TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_state
  ON dashboard_cards (user_id, state);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_goal
  ON dashboard_cards (user_id, pinned_goal_id);

CREATE TABLE IF NOT EXISTS pinned_queries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  question TEXT NOT NULL,
  wiki_slug TEXT,
  last_answer_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pinned_queries_user
  ON pinned_queries (user_id);

CREATE TABLE IF NOT EXISTS card_dismissals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  card_id TEXT NOT NULL,
  verb TEXT NOT NULL,
  payload_json TEXT DEFAULT '',
  created_at INTEGER NOT NULL,
  ingested INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_dismissals_user_ingested
  ON card_dismissals (user_id, ingested);
