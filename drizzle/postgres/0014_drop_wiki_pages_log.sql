-- Wiki content moved to file vault on OpenClaw host; drop Postgres wiki tables.

DROP INDEX IF EXISTS idx_wiki_pages_markdown_trgm;
DROP INDEX IF EXISTS idx_wiki_pages_user_updated;
DROP INDEX IF EXISTS idx_wiki_log_entries_user_created;

DROP TABLE IF EXISTS wiki_log_entries;
DROP TABLE IF EXISTS wiki_pages;
