-- Drop legacy claw tables that were replaced by newer schemas.
-- Do NOT drop `claw_connections` here: init-db reapplies every migration file on
-- each boot, and DROP would wipe saved SSH connections before 0005 runs.

DROP TABLE IF EXISTS claw_session_meta;
DROP TABLE IF EXISTS claw_pairings;
DROP TABLE IF EXISTS cron_jobs;
DROP TABLE IF EXISTS claw_assigned_jobs;
