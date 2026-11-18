
import { getDB, validCredentials, json, error } from "./_db.js";

export async function onRequestGet({ request, env }) {
  try {
    const params = new URL(request.url).searchParams;
    const family = params.get("family"), password = params.get("password");
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    const db = await getDB(env);
    const { results=[] } = await db.prepare(`
      SELECT l.id, l.owner_family AS ownerFamily, l.name, l.created_at AS createdAt,
        CASE WHEN l.owner_family = ? THEN 0 ELSE 1 END AS shared
      FROM shopping_lists l
      WHERE l.owner_family = ? OR EXISTS (
        SELECT 1 FROM shopping_shares s WHERE s.list_id = l.id AND s.family_name = ?
      ) ORDER BY l.created_at DESC
    `).bind(family, family, family).all();
    const lists = [];
    for (const row of results) {
      const { results: items=[] } = await db.prepare(
        "SELECT id, name, done FROM shopping_items WHERE list_id = ? ORDER BY created_at, rowid"
      ).bind(row.id).all();
      lists.push({ ...row, shared: !!row.shared, items: items.map(i => ({...i, done: !!i.done})) });
    }
    return json({ lists });
  } catch {
    return error("לא הצלחנו לטעון. בדקו שחיבור D1 בשם DB מוגדר ב-Cloudflare.", 503);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { family, password, name } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    if (typeof name !== "string" || !name.trim() || name.length > 80) return error("צריך לתת שם לרשימה");
    const db = await getDB(env);
    const existing = await db.prepare("SELECT id FROM shopping_lists WHERE owner_family = ? AND name = ?")
      .bind(family, name.trim()).first();
    if (existing) return json({ id: existing.id, ownerFamily: family, name: name.trim(), shared: false, items: [] });
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO shopping_lists (id, owner_family, name) VALUES (?, ?, ?)")
      .bind(id, family, name.trim()).run();
    return json({ id, ownerFamily: family, name: name.trim(), shared: false, items: [] }, 201);
  } catch {
    return error("לא הצלחנו ליצור רשימה. נסו שוב.", 503);
  }
}
