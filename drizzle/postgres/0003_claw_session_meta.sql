-- Friendly names + pin state for openclaw chat sessions. Replaces the
-- legacy `localStorage["claw-dm-session-names"]` blob so renames travel
-- across devices. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.claw_session_meta (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id text NOT NULL,
  agent_id text NOT NULL,
  session_id text NOT NULL,
  name text,
  pinned_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_claw_session_meta_session
  ON public.claw_session_meta (user_id, connection_id, agent_id, session_id);

CREATE INDEX IF NOT EXISTS idx_claw_session_meta_user_connection
  ON public.claw_session_meta (user_id, connection_id);

-- Owner-only RLS, matching the convention used by the rest of the schema.
ALTER TABLE public.claw_session_meta ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS claw_session_meta_owner ON public.claw_session_meta;
CREATE POLICY claw_session_meta_owner ON public.claw_session_meta
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
