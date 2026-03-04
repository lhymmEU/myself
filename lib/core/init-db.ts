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

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('income','expense','investment')),
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  recurring INTEGER NOT NULL DEFAULT 0,
  linked_node_id TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly' CHECK(period IN ('weekly','monthly')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_pages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '{}',
  linked_node_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK(frequency IN ('daily','weekly')),
  completions TEXT NOT NULL DEFAULT '[]',
  linked_node_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  target_date TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  milestones TEXT NOT NULL DEFAULT '[]',
  linked_node_id TEXT,
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
`;

let initialized = false;

export function initDatabase() {
  if (initialized) return;
  const sqlite = getSqlite();
  sqlite.exec(CREATE_TABLES_SQL);
  initialized = true;
}
