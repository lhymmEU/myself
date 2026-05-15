-- wiki_ingest_state — background wiki-ingest job status (one row per user).
-- Matches lib/db/schema/postgres/insights.ts and drizzle/postgres/0007_wiki_ingest_state.sql.
-- Safe to run in Supabase SQL Editor (idempotent).
--
-- If GET /api/dashboard/insights still fails, create pinned_queries +
-- card_dismissals via scripts/dashboard-insights-tables-supabase.sql (omit
-- dashboard_cards — tiles come from wiki ingest stdout / generative_cards_json).
-- scripts/dashboard-insights-tables-supabase.sql (drizzle/postgres/0006_insights.sql).

CREATE TABLE IF NOT EXISTS public.wiki_ingest_state (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'idle',
  detail text NOT NULL DEFAULT '',
  updated_at bigint NOT NULL
);

COMMENT ON TABLE public.wiki_ingest_state IS
  'Dashboard wiki-ingest job status; updated by server-side Drizzle (getWikiIngestState / upsertWikiIngestState).';

-- Owner-only RLS (same pattern as drizzle/postgres/0002_plan_marked_attachments.sql).
-- The app server typically connects with a role that bypasses RLS; this protects direct client access.
ALTER TABLE public.wiki_ingest_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wiki_ingest_state_owner ON public.wiki_ingest_state;
CREATE POLICY wiki_ingest_state_owner ON public.wiki_ingest_state
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
