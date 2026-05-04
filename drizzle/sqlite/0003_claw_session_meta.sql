-- Friendly names + pin state for openclaw chat sessions. Replaces the
-- legacy `localStorage["claw-dm-session-names"]` blob so renames travel
-- across devices. Idempotent: re-running is a no-op.

CREATE TABLE IF NOT EXISTS claw_session_meta (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  connection_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  name TEXT,
  pinned_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_claw_session_meta_session
  ON claw_session_meta (user_id, connection_id, agent_id, session_id);

CREATE INDEX IF NOT EXISTS idx_claw_session_meta_user_connection
  ON claw_session_meta (user_id, connection_id);
