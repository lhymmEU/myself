-- Owner-only RLS for bento insights tables (direct Supabase / PostgREST as authenticated user).

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
