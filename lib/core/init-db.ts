import { getSqlite } from "./db";

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS life_nodes (
  id TEXT PRIMARY KEY,
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
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}',
  linked_node_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
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
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'demand' CHECK(type IN ('demand','assumption')),
  status TEXT NOT NULL DEFAULT 'unvalidated' CHECK(status IN ('unvalidated','validating','validated','invalidated')),
  evidence TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_clients (
  id TEXT PRIMARY KEY,
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
  name TEXT NOT NULL,
  data_url TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
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
`;

let initialized = false;

export function initDatabase() {
  if (initialized) return;
  const sqlite = getSqlite();
  sqlite.exec(CREATE_TABLES_SQL);

  try {
    sqlite.exec(`ALTER TABLE plan_pages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
    const plans = sqlite
      .prepare(`SELECT id FROM plan_pages ORDER BY created_at ASC`)
      .all() as { id: string }[];
    const stmt = sqlite.prepare(`UPDATE plan_pages SET sort_order = ? WHERE id = ?`);
    plans.forEach((plan, index) => stmt.run(index, plan.id));
  } catch {
    // column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE mind_map_scenes ADD COLUMN mode TEXT NOT NULL DEFAULT 'mind'`);
  } catch {
    // column already exists
  }

  try {
    sqlite.exec(`ALTER TABLE mind_map_scenes ADD COLUMN is_todo_source INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // column already exists
  }

  // Migrate pm_user_profiles from v1 (email/company/role/tags) to v2 (type/typeColor/contact)
  try {
    sqlite.exec(`ALTER TABLE pm_user_profiles ADD COLUMN type TEXT NOT NULL DEFAULT ''`);
    sqlite.exec(`ALTER TABLE pm_user_profiles ADD COLUMN type_color TEXT NOT NULL DEFAULT '#3b82f6'`);
    sqlite.exec(`ALTER TABLE pm_user_profiles ADD COLUMN contact TEXT NOT NULL DEFAULT ''`);
  } catch {
    // columns already exist
  }

  // Add folder support for plans
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS plan_folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  try {
    sqlite.exec(`ALTER TABLE plan_pages ADD COLUMN folder_id TEXT`);
  } catch {
    // column already exists
  }

  // Character appearance table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS character_appearance (
      id TEXT PRIMARY KEY,
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
  `);

  // User skills table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      category TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
  `);

  // Skill wishlist table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS skill_wishlist (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_level INTEGER NOT NULL DEFAULT 5,
      priority TEXT NOT NULL DEFAULT 'medium',
      notes TEXT DEFAULT '',
      created_at INTEGER NOT NULL
    );
  `);

  // Claw assigned jobs table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS claw_assigned_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      cron_job_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  initialized = true;
}
