CREATE TABLE IF NOT EXISTS public.user_wishes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('learn','place','goal')),
  user_description text NOT NULL,
  plan_data text NOT NULL DEFAULT '{}',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

ALTER TABLE public.user_wishes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_wishes_owner ON public.user_wishes;
CREATE POLICY user_wishes_owner ON public.user_wishes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
