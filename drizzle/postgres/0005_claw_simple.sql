-- Re-create the minimal `claw_connections` table for the rebuilt SSH
-- chat page. See lib/db/schema/postgres/claw.ts for the canonical shape.

CREATE TABLE IF NOT EXISTS claw_connections (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  password TEXT,
  private_key TEXT,
  passphrase TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claw_connections_user
  ON claw_connections (user_id);
