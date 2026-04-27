-- Edge transport (Flavor A) — adds the two columns claw_connections needs to
-- support direct browser-WASM SSH via the Cloudflare Worker TCP bridge.
--
-- SQLite has no `ADD COLUMN IF NOT EXISTS`. The migration runner in
-- lib/core/init-db.ts splits this file on `;`, executes each statement
-- defensively, and swallows "duplicate column" errors so re-runs are safe.

ALTER TABLE claw_connections ADD COLUMN credential_secret_id TEXT;

ALTER TABLE claw_connections ADD COLUMN host_key_fingerprint TEXT;
