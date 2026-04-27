-- SQLite bootstrap. Idempotent — safe to re-run.
-- Mirrors lib/db/schema/sqlite/*.ts. Schema-parity test diffs against postgres/.

CREATE TABLE IF NOT EXISTS life_nodes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('category','item')),
  parent_id TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  connections TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
  due_date TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','auto')),
  linked_node_id TEXT,
  llm_reasoning TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_pages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}',
  linked_node_id TEXT,
  folder_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL DEFAULT 'local-user',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS events_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  module TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mind_map_scenes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL DEFAULT 'Untitled',
  elements TEXT NOT NULL DEFAULT '[]',
  app_state TEXT NOT NULL DEFAULT '{}',
  files TEXT NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'mind' CHECK(mode IN ('mind','product')),
  is_todo_source INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pm_user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT '',
  type_color TEXT NOT NULL DEFAULT '#3b82f6',
  contact TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pm_features (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','in-progress','done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
  notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pm_demands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'demand' CHECK(type IN ('demand','assumption')),
  status TEXT NOT NULL DEFAULT 'unvalidated' CHECK(status IN ('unvalidated','validating','validated','invalidated')),
  evidence TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pm_stakeholders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  role_color TEXT NOT NULL DEFAULT '#8b5cf6',
  details TEXT NOT NULL DEFAULT '{}',
  claw_notes TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_clients (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  company TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_signatures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  data_url TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  invoice_number TEXT NOT NULL UNIQUE,
  client_id TEXT REFERENCES invoice_clients(id),
  date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','sent','paid','overdue')),
  currency TEXT NOT NULL DEFAULT 'USD',
  sender_name TEXT,
  sender_email TEXT,
  sender_phone TEXT,
  payment_info TEXT,
  signature_id TEXT REFERENCES invoice_signatures(id),
  notes TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  rate REAL NOT NULL DEFAULT 0,
  quantity REAL NOT NULL DEFAULT 1,
  amount REAL NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS character_appearance (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  character_type TEXT NOT NULL,
  skin_color TEXT,
  hair_color TEXT,
  shirt_color TEXT,
  pants_color TEXT,
  shoe_color TEXT,
  shell_color TEXT,
  shell_dark_color TEXT,
  belly_color TEXT,
  eye_color TEXT
);

CREATE TABLE IF NOT EXISTS user_skills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'familiar' CHECK(level IN ('familiar','fluent','mastering')),
  category TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_wishlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  target_level TEXT NOT NULL DEFAULT 'familiar' CHECK(target_level IN ('familiar','fluent','mastering')),
  priority TEXT NOT NULL DEFAULT 'medium',
  notes TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wishlist_todos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  wish_id TEXT NOT NULL,
  content TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS claw_assigned_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  cron_job_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking' CHECK(type IN ('checking','savings','credit','investment','cash')),
  currency TEXT NOT NULL DEFAULT 'USD',
  balance REAL NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'wallet',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  account_id TEXT NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'expense' CHECK(type IN ('income','expense','transfer')),
  category TEXT NOT NULL DEFAULT 'other',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  recurring INTEGER NOT NULL DEFAULT 0,
  recurring_interval TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  category TEXT NOT NULL,
  monthly_limit REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finance_investments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  account_id TEXT NOT NULL REFERENCES finance_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares REAL NOT NULL DEFAULT 0,
  avg_cost_basis REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS marked_collections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  notes TEXT,
  slug TEXT UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS marked_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  source_tag TEXT,
  notes TEXT,
  favicon TEXT,
  og_image TEXT,
  og_description TEXT,
  collection_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cron_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  command TEXT NOT NULL,
  session_id TEXT,
  agent_id TEXT,
  connection_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS claw_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_method TEXT NOT NULL DEFAULT 'key',
  password TEXT,
  private_key TEXT,
  passphrase TEXT,
  gateway_port INTEGER NOT NULL DEFAULT 18789,
  is_default INTEGER NOT NULL DEFAULT 0,
  transport TEXT NOT NULL DEFAULT 'ssh',
  pairing_code TEXT,
  pairing_expires_at INTEGER,
  agent_jwt TEXT,
  relay_url TEXT,
  public_key TEXT,
  credential_secret_id TEXT,
  host_key_fingerprint TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS vault_meta (
  user_id TEXT NOT NULL DEFAULT 'local-user',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS vault_secrets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  encrypted_value TEXT NOT NULL,
  nonce TEXT NOT NULL,
  encrypted_notes TEXT,
  notes_nonce TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Mirrors public.claw_pairings on Postgres. Used by lobsterd pairing flow
-- (cloud only). Local installs leave this table empty.
CREATE TABLE IF NOT EXISTS claw_pairings (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  lobster_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  agent_jwt TEXT,
  created_at INTEGER NOT NULL
);
