import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa, fetchAll } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 06.11.2026: разовое восстановление числа комнат у старых объявлений из парсера
// (раньше «не распознано» сохранялось как 0). Используется скриптом fix_rooms.py.
// GET ?city=Тбилиси — объявления с rooms 0/null, не «Студия», со ссылкой на исходный пост.
// POST {items:[{id, rooms}]} — проставить rooms (1..9), студии не трогаем.
function auth() {
  const s = verifySession(cookies().get("bx_session")?.value);
  return can(s, "moderate");
}

export async function GET(req) {
  if (!auth()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const city = new URL(req.url).searchParams.get("city") || "";
  const rows = await fetchAll("listings", "id,source_url,rooms,type,district",
    (q) => { let x = q.or("rooms.is.null,rooms.eq.0").neq("type", "Студия").not("source_url", "is", null); if (city) x = x.eq("district", city); return x.order("created_at", { ascending: false }); });
  return Response.json({ ok: true, items: rows.map((r) => ({ id: r.id, url: r.source_url, type: r.type })) });
}

export async function POST(req) {
  if (!auth()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const b = await req.json().catch(() => ({}));
  const items = Array.isArray(b.items) ? b.items.slice(0, 500) : [];
  let updated = 0;
  for (const it of items) {
    const n = parseInt(it.rooms, 10);
    if (!it.id || !(n >= 1 && n <= 9)) continue;
    const { error } = await supa.from("listings").update({ rooms: n }).eq("id", it.id).neq("type", "Студия").or("rooms.is.null,rooms.eq.0");
    if (!error) updated++;
  }
  return Response.json({ ok: true, updated });
}
