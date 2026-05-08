-- Tracks background wiki-ingest job status (cloud mirror of sqlite/0007).

CREATE TABLE IF NOT EXISTS wiki_ingest_state (
  user_id UUID NOT NULL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'idle',
  detail TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL
);
