// Cloudflare Pages redeploy trigger: this file has valid try/catch structure.

import { getDB, validCredentials, json, error } from "./_db.js";

export async function onRequestGet({ request, env }) {
  try {
    const family = request.headers.get("X-Family");
    const password = request.headers.get("X-Password");

    if (!await validCredentials(family, password)) {
      return error("שם המשפחה או הסיסמה שגויים", 401);
    }

    const db = await getDB(env);

    const { results = [] } = await db.prepare(`
      SELECT l.id, l.owner_family AS ownerFamily, l.name,
        l.created_at AS createdAt,
        CASE WHEN l.owner_family = ? THEN 0 ELSE 1 END AS shared
      FROM shopping_lists l
      WHERE l.owner_family = ? OR EXISTS (
        SELECT 1 FROM shopping_shares s
        WHERE s.list_id = l.id AND s.family_name = ?
      )
      ORDER BY l.created_at DESC
    `).bind(family, family, family).all();

    const lists = [];

    for (const row of results) {
      const { results: items = [] } = await db.prepare(
        "SELECT id, name, done FROM shopping_items WHERE list_id = ? ORDER BY created_at, rowid"
      ).bind(row.id).all();

      lists.push({
        ...row,
        shared: !!row.shared,
        items: items.map(i => ({ ...i, done: !!i.done }))
      });
    }

    return json({ lists });
  } catch (e) {
    console.error("GET /api/lists failed:", e);
    return error("תקלה בטעינת הרשימות: " + (e?.message || String(e)), 503);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const { family, password, name, action } = await request.json();

    if (!await validCredentials(family, password)) {
      return error("שם המשפחה או הסיסמה שגויים", 401);
    }

    const db = await getDB(env);

    if (action === "load") {
      const { results = [] } = await db.prepare(`
        SELECT l.id, l.owner_family AS ownerFamily, l.name,
          l.created_at AS createdAt,
          CASE WHEN l.owner_family = ? THEN 0 ELSE 1 END AS shared
        FROM shopping_lists l
        WHERE l.owner_family = ? OR EXISTS (
          SELECT 1 FROM shopping_shares s
          WHERE s.list_id = l.id AND s.family_name = ?
        )
        ORDER BY l.created_at DESC
      `).bind(family, family, family).all();

      const lists = [];
      for (const row of results) {
        const { results: items = [] } = await db.prepare(
          "SELECT id, name, done FROM shopping_items WHERE list_id = ? ORDER BY created_at, rowid"
        ).bind(row.id).all();
        lists.push({ ...row, shared: !!row.shared, items: items.map(i => ({ ...i, done: !!i.done })) });
      }
      return json({ lists });
    }

    if (typeof name !== "string" || !name.trim() || name.length > 80) {
      return error("צריך לתת שם לרשימה");
    }

    const existing = await db.prepare(
      "SELECT id FROM shopping_lists WHERE owner_family = ? AND name = ?"
    ).bind(family, name.trim()).first();

    if (existing) {
      return json({
        id: existing.id,
        ownerFamily: family,
        name: name.trim(),
        shared: false,
        items: []
      });
    }

    const id = crypto.randomUUID();

    await db.prepare(
      "INSERT INTO shopping_lists (id, owner_family, name) VALUES (?, ?, ?)"
    ).bind(id, family, name.trim()).run();

    return json({
      id,
      ownerFamily: family,
      name: name.trim(),
      shared: false,
      items: []
    }, 201);
  } catch (e) {
    console.error("POST /api/lists failed:", e);
    return error("לא הצלחנו ליצור רשימה: " + (e?.message || String(e)), 503);
  }
}
