
import { getDB, validFamily, validCredentials, json, error } from "./_db.js";

export async function onRequestPost({ request, env }) {
  try {
    const { family, password, listId, targetFamily } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    if (!validFamily(targetFamily)) return error("יש לבחור משפחה מהרשימה");
    if (family === targetFamily) return error("זו כבר הרשימה של המשפחה שלך");
    const db = await getDB(env);
    const list = await db.prepare("SELECT owner_family FROM shopping_lists WHERE id = ?").bind(listId).first();
    if (!list) return error("הרשימה לא נמצאה", 404);
    if (list.owner_family !== family) return error("רק מי שיצר את הרשימה יכול לשתף אותה", 403);
    await db.prepare("INSERT OR IGNORE INTO shopping_shares (list_id, family_name) VALUES (?, ?)")
      .bind(listId, targetFamily).run();
    return json({ ok: true, sharedWith: targetFamily });
  } catch {
    return error("לא הצלחנו לשתף את הרשימה.", 503);
  }
}
