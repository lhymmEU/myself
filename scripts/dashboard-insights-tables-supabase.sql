-- Bento dashboard insights tables (GET /api/dashboard/insights).
-- Dashboard tiles are **not** in Postgres; they live in
-- `wiki_ingest_state.generative_cards_json` (parsed from OpenClaw stdout).
-- This script provisions pinned_queries + card_dismissals only. Idempotent.

DROP TABLE IF EXISTS public.dashboard_cards CASCADE;

CREATE TABLE IF NOT EXISTS public.pinned_queries (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  question text NOT NULL,
  wiki_slug text,
  last_answer_at bigint,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pinned_queries_user
  ON public.pinned_queries (user_id);

CREATE TABLE IF NOT EXISTS public.card_dismissals (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  card_id text NOT NULL,
  verb text NOT NULL,
  payload_json text DEFAULT '',
  created_at bigint NOT NULL,
  ingested bigint NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_card_dismissals_user_ingested
  ON public.card_dismissals (user_id, ingested);

ALTER TABLE public.wiki_ingest_state
  ADD COLUMN IF NOT EXISTS generative_cards_json text;

-- RLS for OpenClaw / supabase-js as authenticated user (idempotent).
ALTER TABLE public.pinned_queries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pinned_queries_owner ON public.pinned_queries;
CREATE POLICY pinned_queries_owner ON public.pinned_queries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.card_dismissals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS card_dismissals_owner ON public.card_dismissals;
CREATE POLICY card_dismissals_owner ON public.card_dismissals
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
