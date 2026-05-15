-- agent_registrations + agent_events for the push-based ingest model.
-- Matches lib/db/schema/postgres/agent.ts.
-- Safe to run in Supabase SQL Editor (idempotent).
--
-- After running, the `agent_events` table is added to the supabase_realtime
-- publication so the agent CLI (and the dashboard, for cards) can subscribe.

-- ---------------------------------------------------------------------------
-- agent_registrations: one row per user. PK on user_id enforces single-agent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_registrations (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  token_jti text NOT NULL,
  created_at bigint NOT NULL,
  last_seen_at bigint
);

COMMENT ON TABLE public.agent_registrations IS
  'One row per user; stores the jti of the currently-active Supabase JWT issued to the user''s self-hosted agent CLI.';

ALTER TABLE public.agent_registrations ENABLE ROW LEVEL SECURITY;

-- The browser session can read/write its own row.
DROP POLICY IF EXISTS agent_registrations_owner ON public.agent_registrations;
CREATE POLICY agent_registrations_owner ON public.agent_registrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- agent_events: durable, ordered queue of work for the agent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_events (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  blob_path text,
  source_ref jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at bigint NOT NULL,
  processed_at bigint,
  error text
);

COMMENT ON TABLE public.agent_events IS
  'Queue of push-ingest events for the user''s agent; processed strictly serial by created_at.';

CREATE INDEX IF NOT EXISTS agent_events_user_status_created_idx
  ON public.agent_events (user_id, status, created_at);

ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;

-- Permissive owner policy: standard "user owns their rows" rule.
DROP POLICY IF EXISTS agent_events_owner ON public.agent_events;
CREATE POLICY agent_events_owner ON public.agent_events
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Restrictive guard (AND'd with the owner policy): when the caller's JWT is
-- an agent token (carries `agent: true`), its `jti` claim must match the
-- currently-registered jti for that user. Browser sessions have no `agent`
-- claim and pass through unchanged. This is how we invalidate stale agent
-- tokens after the user re-pairs without rotating the JWT signing secret.
DROP POLICY IF EXISTS agent_events_agent_jti_match ON public.agent_events;
CREATE POLICY agent_events_agent_jti_match ON public.agent_events
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = (
      SELECT token_jti FROM public.agent_registrations
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = (
      SELECT token_jti FROM public.agent_registrations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS agent_registrations_agent_jti_match ON public.agent_registrations;
CREATE POLICY agent_registrations_agent_jti_match ON public.agent_registrations
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = token_jti
  )
  WITH CHECK (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = token_jti
  );

-- Same guard on wiki_ingest_state, since the agent writes regenerated cards
-- there. Browsers (regular user sessions) keep their existing access.
DROP POLICY IF EXISTS wiki_ingest_state_agent_jti_match ON public.wiki_ingest_state;
CREATE POLICY wiki_ingest_state_agent_jti_match ON public.wiki_ingest_state
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = (
      SELECT token_jti FROM public.agent_registrations
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.jwt() ->> 'agent') IS DISTINCT FROM 'true'
    OR auth.jwt() ->> 'jti' = (
      SELECT token_jti FROM public.agent_registrations
      WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage bucket for oversized event payloads (> 256 KB inline limit).
-- Path convention: {user_id}/{event_id}.json. Owner-only access via RLS.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-event-blobs', 'agent-event-blobs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS agent_event_blobs_owner ON storage.objects;
CREATE POLICY agent_event_blobs_owner ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'agent-event-blobs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'agent-event-blobs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Realtime publication: agent_events for CLI subscription; wiki_ingest_state
-- for dashboard card live-updates. Add only if not already a member.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'agent_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'wiki_ingest_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wiki_ingest_state;
  END IF;
END$$;
