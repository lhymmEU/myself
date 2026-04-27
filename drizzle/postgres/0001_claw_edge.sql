-- Edge transport (Flavor A) — adds the two columns claw_connections needs to
-- support direct browser-WASM SSH via the Cloudflare Worker TCP bridge.
--
-- Idempotent. Safe to re-run on existing deployments.

ALTER TABLE public.claw_connections
  ADD COLUMN IF NOT EXISTS credential_secret_id text;

ALTER TABLE public.claw_connections
  ADD COLUMN IF NOT EXISTS host_key_fingerprint text;
