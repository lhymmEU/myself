-- Bento dashboard insights tables (GET /api/dashboard/insights).
-- Mirrors drizzle/postgres/0006_insights.sql + lib/db/schema/postgres/insights.ts
-- (dashboard_cards, pinned_queries, card_dismissals). Idempotent.

CREATE TABLE IF NOT EXISTS public.dashboard_cards (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  hue bigint NOT NULL DEFAULT 210,
  freshness bigint NOT NULL,
  confidence text NOT NULL DEFAULT 'thin',
  sources_json text NOT NULL DEFAULT '[]',
  wiki_slug text,
  pinned_goal_id text,
  priority bigint NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'active',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_state
  ON public.dashboard_cards (user_id, state);

CREATE INDEX IF NOT EXISTS idx_dashboard_cards_user_goal
  ON public.dashboard_cards (user_id, pinned_goal_id);

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

-- RLS for OpenClaw / supabase-js as authenticated user (idempotent).
ALTER TABLE public.dashboard_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dashboard_cards_owner ON public.dashboard_cards;
CREATE POLICY dashboard_cards_owner ON public.dashboard_cards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
