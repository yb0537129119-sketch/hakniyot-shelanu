import { getDB, validCredentials, canAccess, json, error } from "./_db.js";

export async function onRequestPost({ request, env }) {
  try {
    const { family, password, listId } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    const db = await getDB(env);
    if (!await canAccess(db, listId, family)) return error("אין גישה לרשימה", 403);
    const { results = [] } = await db.prepare(`
      SELECT item_name AS itemName, add_count AS addCount, last_added_at AS lastAddedAt
      FROM shopping_item_history
      WHERE family_name = ? AND list_id = ?
      ORDER BY last_added_at DESC, item_name COLLATE NOCASE
    `).bind(family, listId).all();
    return json({ items: results });
  } catch (e) {
    console.error("POST /api/history failed:", e);
    return error("לא הצלחנו לטעון את היסטוריית המוצרים.", 503);
  }
}
