-- Postgres bootstrap (Supabase). Idempotent.
-- All user-owned tables FK to auth.users(id) and have RLS enabled with
-- "owner only" policies via auth.uid().

-- ---------- mind-map ----------
CREATE TABLE IF NOT EXISTS public.life_nodes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  type text NOT NULL CHECK (type IN ('category','item')),
  parent_id text,
  color text NOT NULL DEFAULT '#6366f1',
  position_x double precision NOT NULL DEFAULT 0,
  position_y double precision NOT NULL DEFAULT 0,
  connections text NOT NULL DEFAULT '[]',
  metadata text NOT NULL DEFAULT '{}',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mind_map_scenes (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled',
  elements text NOT NULL DEFAULT '[]',
  app_state text NOT NULL DEFAULT '{}',
  files text NOT NULL DEFAULT '{}',
  mode text NOT NULL DEFAULT 'mind' CHECK (mode IN ('mind','product')),
  is_todo_source bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pm_user_profiles (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT '',
  type_color text NOT NULL DEFAULT '#3b82f6',
  contact text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pm_features (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in-progress','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  notes text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pm_demands (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'demand' CHECK (type IN ('demand','assumption')),
  status text NOT NULL DEFAULT 'unvalidated' CHECK (status IN ('unvalidated','validating','validated','invalidated')),
  evidence text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pm_stakeholders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT '',
  role_color text NOT NULL DEFAULT '#8b5cf6',
  details text NOT NULL DEFAULT '{}',
  claw_notes text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- todos ----------
CREATE TABLE IF NOT EXISTS public.todos (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  completed bigint NOT NULL DEFAULT 0,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','auto')),
  linked_node_id text,
  llm_reasoning text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- plans ----------
CREATE TABLE IF NOT EXISTS public.plan_folders (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.plan_pages (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '{}',
  linked_node_id text,
  folder_id text,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- settings ----------
CREATE TABLE IF NOT EXISTS public.settings (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  updated_at bigint NOT NULL,
  PRIMARY KEY (user_id, key)
);

-- ---------- dashboard ----------
CREATE TABLE IF NOT EXISTS public.character_appearance (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_type text NOT NULL,
  skin_color text,
  hair_color text,
  shirt_color text,
  pants_color text,
  shoe_color text,
  shell_color text,
  shell_dark_color text,
  belly_color text,
  eye_color text
);

CREATE TABLE IF NOT EXISTS public.user_skills (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  level text NOT NULL DEFAULT 'familiar' CHECK (level IN ('familiar','fluent','mastering')),
  category text DEFAULT '',
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.skill_wishlist (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_level text NOT NULL DEFAULT 'familiar' CHECK (target_level IN ('familiar','fluent','mastering')),
  priority text NOT NULL DEFAULT 'medium',
  notes text DEFAULT '',
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.wishlist_todos (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wish_id text NOT NULL,
  content text NOT NULL,
  completed bigint NOT NULL DEFAULT 0,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.claw_assigned_jobs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  cron_job_id text,
  created_at bigint NOT NULL
);

-- ---------- invoice ----------
CREATE TABLE IF NOT EXISTS public.invoice_clients (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  company text,
  notes text,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_signatures (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  data_url text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoices (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  client_id text REFERENCES public.invoice_clients(id),
  date text NOT NULL,
  due_date text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid','overdue')),
  currency text NOT NULL DEFAULT 'USD',
  sender_name text,
  sender_email text,
  sender_phone text,
  payment_info text,
  signature_id text REFERENCES public.invoice_signatures(id),
  notes text,
  subtotal double precision NOT NULL DEFAULT 0,
  tax double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id text PRIMARY KEY,
  invoice_id text NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  rate double precision NOT NULL DEFAULT 0,
  quantity double precision NOT NULL DEFAULT 1,
  amount double precision NOT NULL DEFAULT 0,
  sort_order bigint NOT NULL DEFAULT 0
);

-- ---------- marked ----------
CREATE TABLE IF NOT EXISTS public.marked_collections (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  slug text UNIQUE,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.marked_items (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  source_tag text,
  notes text,
  favicon text,
  og_image text,
  og_description text,
  collection_id text,
  sort_order bigint NOT NULL DEFAULT 0,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- claw ----------
CREATE TABLE IF NOT EXISTS public.cron_jobs (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  expression text NOT NULL,
  command text NOT NULL,
  session_id text,
  agent_id text,
  connection_id text,
  enabled boolean NOT NULL DEFAULT true,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.claw_connections (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 22,
  username text NOT NULL,
  auth_method text NOT NULL DEFAULT 'key',
  password text,
  private_key text,
  passphrase text,
  gateway_port integer NOT NULL DEFAULT 18789,
  is_default boolean NOT NULL DEFAULT false,
  transport text NOT NULL DEFAULT 'ssh',
  pairing_code text,
  pairing_expires_at bigint,
  agent_jwt text,
  relay_url text,
  public_key text,
  credential_secret_id text,
  host_key_fingerprint text,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- finance ----------
CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'checking' CHECK (type IN ('checking','savings','credit','investment','cash')),
  currency text NOT NULL DEFAULT 'USD',
  balance double precision NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'wallet',
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL REFERENCES public.finance_accounts(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'expense' CHECK (type IN ('income','expense','transfer')),
  category text NOT NULL DEFAULT 'other',
  amount double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  date text NOT NULL,
  description text NOT NULL DEFAULT '',
  recurring bigint NOT NULL DEFAULT 0,
  recurring_interval text,
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_budgets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS public.finance_investments (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id text NOT NULL REFERENCES public.finance_accounts(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  shares double precision NOT NULL DEFAULT 0,
  avg_cost_basis double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at bigint NOT NULL
);

-- ---------- vault ----------
CREATE TABLE IF NOT EXISTS public.vault_meta (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS public.vault_secrets (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  encrypted_value text NOT NULL,
  nonce text NOT NULL,
  encrypted_notes text,
  notes_nonce text,
  tags text NOT NULL DEFAULT '[]',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

-- ---------- pairing codes (cloud-only relay metadata) ----------
CREATE TABLE IF NOT EXISTS public.claw_pairings (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lobster_id text NOT NULL,
  expires_at bigint NOT NULL,
  consumed_at bigint,
  agent_jwt text,
  created_at bigint NOT NULL
);

-- ---------- RLS ----------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'life_nodes','mind_map_scenes','pm_user_profiles','pm_features','pm_demands','pm_stakeholders',
      'todos','plan_folders','plan_pages','settings',
      'character_appearance','user_skills','skill_wishlist','wishlist_todos','claw_assigned_jobs',
      'invoice_clients','invoice_signatures','invoices',
      'marked_collections','marked_items',
      'cron_jobs','claw_connections',
      'finance_accounts','finance_transactions','finance_budgets','finance_investments',
      'vault_meta','vault_secrets',
      'claw_pairings'
    ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      t || '_owner', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())',
      t || '_owner', t
    );
  END LOOP;
END $$;

-- invoice_items inherits owner from parent invoice (no user_id of its own).
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS invoice_items_owner ON public.invoice_items;
CREATE POLICY invoice_items_owner ON public.invoice_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_life_nodes_user ON public.life_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_user ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_pages_user ON public.plan_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_user_date ON public.finance_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_marked_items_user_collection ON public.marked_items(user_id, collection_id);
CREATE INDEX IF NOT EXISTS idx_pairings_user ON public.claw_pairings(user_id);
