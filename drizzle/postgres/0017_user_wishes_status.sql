-- Adds a status column to user_wishes so the UI can show "expanding" while
-- the agent watcher is filling in plan_data after a wish.expand event.
ALTER TABLE "user_wishes"
  ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'ready';

ALTER TABLE "user_wishes"
  ADD CONSTRAINT "user_wishes_status_check"
  CHECK ("status" IN ('expanding', 'ready', 'error'));
