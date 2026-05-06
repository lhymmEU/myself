-- Drop all legacy claw tables. Phase 2 will recreate `claw_connections`
-- with a minimal schema in 0005_claw_simple.sql.

DROP TABLE IF EXISTS claw_session_meta;
DROP TABLE IF EXISTS claw_pairings;
DROP TABLE IF EXISTS claw_connections;
DROP TABLE IF EXISTS cron_jobs;
DROP TABLE IF EXISTS claw_assigned_jobs;
