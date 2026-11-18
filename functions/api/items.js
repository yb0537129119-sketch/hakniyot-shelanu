
import { getDB, validCredentials, canAccess, json, error } from "./_db.js";

export async function onRequestPost({ request, env }) {
  try {
    const { family, password, listId, name } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    if (typeof name !== "string" || !name.trim() || name.length > 100) return error("שם מוצר לא תקין");
    const db = await getDB(env);
    if (!await canAccess(db, listId, family)) return error("אין גישה לרשימה", 403);
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO shopping_items (id, list_id, name) VALUES (?, ?, ?)")
      .bind(id, listId, name.trim()).run();
    return json({ id, listId, name: name.trim(), done: false }, 201);
  } catch {
    return error("לא הצלחנו להוסיף את המוצר.", 503);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const { family, password, id, done } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    if (typeof done !== "boolean") return error("סטטוס לא תקין");
    const db = await getDB(env);
    const item = await db.prepare("SELECT list_id FROM shopping_items WHERE id = ?").bind(id).first();
    if (!item || !await canAccess(db, item.list_id, family)) return error("המוצר לא נמצא או שאין גישה", 404);
    await db.prepare("UPDATE shopping_items SET done = ? WHERE id = ?").bind(done ? 1 : 0, id).run();
    return json({ ok: true });
  } catch {
    return error("לא הצלחנו לעדכן את המוצר.", 503);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    const { family, password, id } = await request.json();
    if (!await validCredentials(family, password)) return error("שם המשפחה או הסיסמה שגויים", 401);
    const db = await getDB(env);
    const item = await db.prepare("SELECT list_id FROM shopping_items WHERE id = ?").bind(id).first();
    if (!item || !await canAccess(db, item.list_id, family)) return error("המוצר לא נמצא או שאין גישה", 404);
    await db.prepare("DELETE FROM shopping_items WHERE id = ?").bind(id).run();
    return json({ ok: true });
  } catch {
    return error("לא הצלחנו למחוק את המוצר.", 503);
  }
}
