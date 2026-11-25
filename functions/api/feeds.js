import { getDB, json, error } from "./_db.js";

const FAMILY = "המשפחה שלנו";

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const { action } = body;
    const family = FAMILY;
    const db = await getDB(env);

    if (action === "load") {
      const { results = [] } = await db.prepare(
        "SELECT id, fed_at AS fedAt, feed_type AS feedType, amount_ml AS amountMl, duration_minutes AS durationMinutes, side, next_due_at AS nextDueAt, notes FROM baby_feeds WHERE family_name = ? ORDER BY fed_at DESC LIMIT 200"
      ).bind(family).all();
      const setting = await db.prepare("SELECT next_due_at AS nextDueAt FROM baby_feed_settings WHERE family_name = ?").bind(family).first();
      return json({ feeds: results, nextDueAt: setting?.nextDueAt || results.find(x => x.nextDueAt)?.nextDueAt || null });
    }

    if (action === "setNext") {
      const value = body.nextDueAt || null;
      if (value && Number.isNaN(Date.parse(value))) return error("שעת ההאכלה הבאה לא תקינה");
      await db.prepare("INSERT INTO baby_feed_settings (family_name, next_due_at) VALUES (?, ?) ON CONFLICT(family_name) DO UPDATE SET next_due_at = excluded.next_due_at").bind(family, value).run();
      return json({ ok: true, nextDueAt: value });
    }

    if (action === "add") {
      const { fedAt, feedType, amountMl, durationMinutes, side, nextDueAt, notes } = body;
      if (!fedAt || Number.isNaN(Date.parse(fedAt))) return error("צריך לבחור מתי הייתה ההאכלה");
      if (!["בקבוק", "הנקה", "אחר", "רישום מהיר"].includes(feedType)) return error("סוג האכלה לא תקין");
      const amount = amountMl === "" || amountMl == null ? null : Number(amountMl);
      const duration = durationMinutes === "" || durationMinutes == null ? null : Number(durationMinutes);
      if (amount !== null && (!Number.isInteger(amount) || amount < 1 || amount > 2000)) return error("כמות לא תקינה");
      if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 300)) return error("משך זמן לא תקין");
      if (nextDueAt && Number.isNaN(Date.parse(nextDueAt))) return error("שעת ההאכלה הבאה לא תקינה");
      const id = crypto.randomUUID();
      await db.prepare("INSERT INTO baby_feeds (id, family_name, fed_at, feed_type, amount_ml, duration_minutes, side, next_due_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(id, family, fedAt, feedType, amount, duration, side || null, nextDueAt || null, String(notes || "").slice(0, 500)).run();
      if (nextDueAt) await db.prepare("INSERT INTO baby_feed_settings (family_name, next_due_at) VALUES (?, ?) ON CONFLICT(family_name) DO UPDATE SET next_due_at = excluded.next_due_at").bind(family, nextDueAt).run();
      return json({ ok: true, id }, 201);
    }

    if (action === "update") {
      const { id, fedAt, feedType, amountMl, durationMinutes, side, nextDueAt, notes } = body;
      if (!id || !fedAt || Number.isNaN(Date.parse(fedAt)) || !["בקבוק", "הנקה", "אחר", "רישום מהיר"].includes(feedType)) return error("פרטי ההאכלה לא תקינים");
      const amount = amountMl === "" || amountMl == null ? null : Number(amountMl);
      const duration = durationMinutes === "" || durationMinutes == null ? null : Number(durationMinutes);
      if (amount !== null && (!Number.isInteger(amount) || amount < 1 || amount > 2000)) return error("כמות לא תקינה");
      if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 300)) return error("משך זמן לא תקין");
      const result = await db.prepare("UPDATE baby_feeds SET fed_at=?, feed_type=?, amount_ml=?, duration_minutes=?, side=?, next_due_at=?, notes=? WHERE id=? AND family_name=?")
        .bind(fedAt, feedType, amount, duration, side || null, nextDueAt || null, String(notes || "").slice(0, 500), id, family).run();
      if (!result.meta?.changes) return error("הרישום לא נמצא", 404);
      await db.prepare("INSERT INTO baby_feed_settings (family_name, next_due_at) VALUES (?, ?) ON CONFLICT(family_name) DO UPDATE SET next_due_at = excluded.next_due_at").bind(family, nextDueAt || null).run();
      return json({ ok: true });
    }

    if (action === "delete") {
      const result = await db.prepare("DELETE FROM baby_feeds WHERE id=? AND family_name=?").bind(body.id, family).run();
      if (!result.meta?.changes) return error("הרישום לא נמצא", 404);
      return json({ ok: true });
    }

    return error("פעולה לא מוכרת");
  } catch (e) {
    console.error("baby feeds API error", e);
    return error("לא הצלחנו לשמור את הרישום. נסו שוב.", 503);
  }
}