-- Drop legacy wiki tables (content moved to OpenClaw file vault).
-- Run in Supabase SQL Editor after deploying app code that no longer uses these tables.
-- Idempotent.

DROP INDEX IF EXISTS idx_wiki_pages_markdown_trgm;
DROP INDEX IF EXISTS idx_wiki_pages_user_updated;
DROP INDEX IF EXISTS idx_wiki_log_entries_user_created;

DROP TABLE IF EXISTS wiki_log_entries;
DROP TABLE IF EXISTS wiki_pages;
