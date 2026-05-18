-- Drops the legacy SSH-based Claw connection model. The agent now talks to
-- the user's machine through the Supabase event queue (`agent_events` +
-- `agent_registrations`), so per-user SSH credentials are no longer stored
-- in the dashboard.
DROP TABLE IF EXISTS "claw_connections";

-- Per-connection session display labels were stored as JSON values in the
-- `settings` table under keys of the form `claw.sessionLabels:<connectionId>`.
-- Clean those up so they don't accumulate as orphans.
DELETE FROM "settings" WHERE "key" LIKE 'claw.sessionLabels:%';

-- LLM API key + model preferences from the deleted OpenRouter integration.
DELETE FROM "settings" WHERE "key" IN ('openrouter_api_key', 'llm_model', 'llm_temperature');
