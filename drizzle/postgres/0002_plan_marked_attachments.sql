-- Plan ↔ Marked attachments join table. Lets a plan page reference any number
-- of marked items for quick reference. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.plan_marked_attachments (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  marked_item_id text NOT NULL,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plan_marked_attachments_user_plan
  ON public.plan_marked_attachments (user_id, plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_marked_attachments_user_item
  ON public.plan_marked_attachments (user_id, marked_item_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_marked_attachments_pair
  ON public.plan_marked_attachments (user_id, plan_id, marked_item_id);

-- Owner-only RLS, matching the convention used by the rest of the schema.
ALTER TABLE public.plan_marked_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plan_marked_attachments_owner ON public.plan_marked_attachments;
CREATE POLICY plan_marked_attachments_owner ON public.plan_marked_attachments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
