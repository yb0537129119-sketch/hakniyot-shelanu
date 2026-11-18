CREATE TABLE IF NOT EXISTS shopping_lists (
  id TEXT PRIMARY KEY, owner_family TEXT NOT NULL, name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS shopping_items (
  id TEXT PRIMARY KEY, list_id TEXT NOT NULL, name TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS shopping_shares (
  list_id TEXT NOT NULL, family_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(list_id, family_name),
  FOREIGN KEY(list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lists_owner ON shopping_lists(owner_family);
CREATE INDEX IF NOT EXISTS idx_items_list ON shopping_items(list_id);
CREATE INDEX IF NOT EXISTS idx_shares_family ON shopping_shares(family_name);
