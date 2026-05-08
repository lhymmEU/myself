-- Bento dashboard insight cache + user-action audit (cloud / Postgres mirror of
-- drizzle/sqlite/0006_insights.sql). See lib/db/schema/postgres/insights.ts.

CREATE TABLE IF NOT EXISTS dashboard_cards (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  hue BIGINT NOT NULL DEFAULT 210,
  freshness BIGINT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'thin',
  sources_json TEXT NOT NULL DEFAULT '[]',
  wiki_slug TEXT,
  pinned_goal_id TEXT,
  priority BIGINT NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'active',
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_state
  ON dashboard_cards (user_id, state);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_goal
  ON dashboard_cards (user_id, pinned_goal_id);

CREATE TABLE IF NOT EXISTS pinned_queries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  wiki_slug TEXT,
  last_answer_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pinned_queries_user
  ON pinned_queries (user_id);

CREATE TABLE IF NOT EXISTS card_dismissals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id TEXT NOT NULL,
  verb TEXT NOT NULL,
  payload_json TEXT DEFAULT '',
  created_at BIGINT NOT NULL,
  ingested BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_dismissals_user_ingested
  ON card_dismissals (user_id, ingested);
