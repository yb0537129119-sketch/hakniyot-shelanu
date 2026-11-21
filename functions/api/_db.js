const FAMILIES = ["משפחת עמר", "משפחת בן גיגי", "משפחת זכאי", "משפחת עוזר", "ינון"];

const PASSWORD_HASHES = {
  "משפחת עמר": "c56688ec4c1b411dc4c498262ed6d5d136ce9bb99c19e1cb40ca3aa509e72404",
  "משפחת בן גיגי": "2850bad13d3db8dcad39db444b95608c4971de292ac4cc43c73ab39bdd3df00e",
  "משפחת זכאי": "40fcacaf921364e6290f48bec2d08d18c04e977c62067973c3899480cb2d1ebd",
  "משפחת עוזר": "1a51b8ff0b914cc7f5a666dd11edf130822a56b1f0a3b4df2ed6318f97e07821",
  "ינון": "a1b621ce8da57e53dc5b3b72c66748404581063ab3f6e13dec9de6242f6de43f"
};

export const validFamily = name => FAMILIES.includes(name);

export async function getDB(env) {
  if (!env.DB) throw new Error("Missing D1 binding: DB");

  // Execute every DDL statement independently; never pass a multi-statement
  // SQL batch to D1.
  const ddl = [
    "CREATE TABLE IF NOT EXISTS shopping_lists (id TEXT PRIMARY KEY, owner_family TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
    "CREATE TABLE IF NOT EXISTS shopping_items (id TEXT PRIMARY KEY, list_id TEXT NOT NULL, name TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS shopping_shares (list_id TEXT NOT NULL, family_name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(list_id, family_name), FOREIGN KEY(list_id) REFERENCES shopping_lists(id) ON DELETE CASCADE)",
    "CREATE TABLE IF NOT EXISTS shopping_item_history (id TEXT PRIMARY KEY, family_name TEXT NOT NULL, list_id TEXT NOT NULL, item_name TEXT NOT NULL, add_count INTEGER NOT NULL DEFAULT 1, last_added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(family_name, list_id, item_name))",
    "CREATE INDEX IF NOT EXISTS idx_lists_owner ON shopping_lists(owner_family)",
    "CREATE INDEX IF NOT EXISTS idx_items_list ON shopping_items(list_id)",
    "CREATE INDEX IF NOT EXISTS idx_shares_family ON shopping_shares(family_name)"
  ];

  for (const statement of ddl) {
    await env.DB.prepare(statement).run();
  }

  // Preserve products that were already present before history was introduced.
  await env.DB.prepare(`
    INSERT OR IGNORE INTO shopping_item_history
      (id, family_name, list_id, item_name, add_count)
    SELECT lower(hex(randomblob(16))), l.owner_family, i.list_id, i.name, 1
    FROM shopping_items i
    JOIN shopping_lists l ON l.id = i.list_id
  `).run();

  return env.DB;
}

export async function validCredentials(name, password) {
  if (!validFamily(name) || typeof password !== "string") return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  return hash === PASSWORD_HASHES[name];
}

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  }
});

export const error = (message, status = 400) => json({ error: message }, status);

export async function canAccess(db, listId, family) {
  const row = await db.prepare(
    "SELECT l.id FROM shopping_lists l WHERE l.id = ? AND (l.owner_family = ? OR EXISTS (SELECT 1 FROM shopping_shares s WHERE s.list_id = l.id AND s.family_name = ?))"
  ).bind(listId, family, family).first();
  return !!row;
}
