-- Plan ↔ Marked attachments join table. Lets a plan page reference any number
-- of marked items for quick reference. Idempotent: re-running is a no-op.

CREATE TABLE IF NOT EXISTS plan_marked_attachments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  plan_id TEXT NOT NULL,
  marked_item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_marked_attachments_user_plan
  ON plan_marked_attachments (user_id, plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_marked_attachments_user_item
  ON plan_marked_attachments (user_id, marked_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_marked_attachments_pair
  ON plan_marked_attachments (user_id, plan_id, marked_item_id);
