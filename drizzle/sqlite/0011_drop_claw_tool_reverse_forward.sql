-- SQLite: remove reverse-SSH tool forward column (OpenClaw uses direct Supabase).
PRAGMA foreign_keys=OFF;
CREATE TABLE claw_connections_new (
  id text PRIMARY KEY NOT NULL,
  user_id text DEFAULT 'local-user' NOT NULL,
  name text NOT NULL,
  host text NOT NULL,
  port integer DEFAULT 22 NOT NULL,
  username text NOT NULL,
  auth_method text NOT NULL,
  password text,
  private_key text,
  passphrase text,
  is_default integer DEFAULT false NOT NULL,
  created_at integer NOT NULL,
  updated_at integer NOT NULL
);
INSERT INTO claw_connections_new (
  id, user_id, name, host, port, username, auth_method,
  password, private_key, passphrase, is_default, created_at, updated_at
)
SELECT
  id, user_id, name, host, port, username, auth_method,
  password, private_key, passphrase, is_default, created_at, updated_at
FROM claw_connections;
DROP TABLE claw_connections;
ALTER TABLE claw_connections_new RENAME TO claw_connections;
PRAGMA foreign_keys=ON;
