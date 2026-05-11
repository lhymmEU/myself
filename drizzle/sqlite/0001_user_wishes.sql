CREATE TABLE IF NOT EXISTS user_wishes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local-user',
  category TEXT NOT NULL CHECK(category IN ('learn','place','goal')),
  user_description TEXT NOT NULL,
  plan_data TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
