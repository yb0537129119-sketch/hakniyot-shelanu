import { getDB, json, error } from "./_db.js";
const FAMILY = "המשפחה שלנו";
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const db = await getDB(env);
    if (body.action === "load") {
      const { results = [] } = await db.prepare("SELECT id, changed_at AS changedAt, diaper_type AS diaperType, notes FROM baby_diapers WHERE family_name=? ORDER BY changed_at DESC LIMIT 100").bind(FAMILY).all();
      return json({ diapers: results });
    }
    if (body.action === "add") {
      const { changedAt, diaperType, notes } = body;
      if (!changedAt || Number.isNaN(Date.parse(changedAt))) return error("צריך לבחור מתי הוחלף החיתול");
      if (!["פיפי","קקי","שניהם"].includes(diaperType)) return error("סוג רישום לא תקין");
      const id=crypto.randomUUID();
      await db.prepare("INSERT INTO baby_diapers (id,family_name,changed_at,diaper_type,notes) VALUES (?,?,?,?,?)").bind(id,FAMILY,changedAt,diaperType,String(notes||"").slice(0,300)).run();
      return json({ok:true,id},201);
    }
    if (body.action === "delete") {
      const result=await db.prepare("DELETE FROM baby_diapers WHERE id=? AND family_name=?").bind(body.id,FAMILY).run();
      if (!result.meta?.changes) return error("הרישום לא נמצא",404);
      return json({ok:true});
    }
    return error("פעולה לא מוכרת");
  } catch(e) {
    console.error("baby diapers API error",e);
    return error("לא הצלחנו לשמור את רישום החיתול. נסו שוב.",503);
  }
}