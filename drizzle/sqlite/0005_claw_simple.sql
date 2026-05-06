-- Re-create the minimal `claw_connections` table for the rebuilt SSH
-- chat page. See lib/db/schema/sqlite/claw.ts for the canonical shape.

CREATE TABLE IF NOT EXISTS claw_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  password TEXT,
  private_key TEXT,
  passphrase TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_claw_connections_user
  ON claw_connections (user_id);
