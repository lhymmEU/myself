-- Tracks background wiki-ingest job status so the dashboard can poll without
-- holding a long HTTP request open (avoids proxy/browser timeouts).

CREATE TABLE IF NOT EXISTS wiki_ingest_state (
  user_id TEXT NOT NULL DEFAULT 'local-user' PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',
  detail TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
