-- Dashboard tiles no longer live in `dashboard_cards`; wiki ingest persists
-- the latest agent card JSON on `wiki_ingest_state.generative_cards_json`.

ALTER TABLE public.wiki_ingest_state
  ADD COLUMN IF NOT EXISTS generative_cards_json TEXT;

DROP TABLE IF EXISTS public.dashboard_cards CASCADE;
