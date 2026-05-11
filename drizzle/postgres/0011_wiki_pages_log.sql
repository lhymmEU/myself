-- Wiki content in Postgres (replaces local filesystem data/wiki).

CREATE TABLE IF NOT EXISTS wiki_pages (
  user_id UUID NOT NULL,
  slug TEXT NOT NULL,
  markdown TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_user_updated
  ON wiki_pages (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS wiki_log_entries (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wiki_log_entries_user_created
  ON wiki_log_entries (user_id, created_at DESC);

-- Substring search helper (Supabase: enable via Dashboard if needed).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_markdown_trgm
  ON wiki_pages USING gin (markdown gin_trgm_ops);

ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wiki_pages_owner ON wiki_pages;
CREATE POLICY wiki_pages_owner ON wiki_pages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE wiki_log_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wiki_log_entries_owner ON wiki_log_entries;
CREATE POLICY wiki_log_entries_owner ON wiki_log_entries FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
