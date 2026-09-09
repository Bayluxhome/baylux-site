// Подборки для клиентов (задача №07): CRUD для кабинета риелтора.
//   GET                  — мои подборки
//   POST {action:"create", title, client_*, note}
//   POST {action:"update", id, title?, client_*?, note?, enabled?}
//   POST {action:"add", id, listingId}     — добавить объект (снимок берётся из публичной выдачи)
//   POST {action:"remove", id, listingId}
//   POST {action:"delete", id}
// Право на изменение проверяется на сервере (владелец или супер-админ).
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { getAllUnits } from "@/data/source";
import { listMine, getById, isOwner, newToken, normClient, itemSnapshot, MAX_ITEMS } from "@/lib/collections";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pub = (c) => ({
  id: c.id, token: c.token, title: c.title, client_name: c.client_name, client_phone: c.client_phone, client_tg: c.client_tg,
  note: c.note, items: Array.isArray(c.items) ? c.items : [], enabled: c.enabled, created_at: c.created_at, updated_at: c.updated_at,
});

export async function GET() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const list = await listMine(session);
  return Response.json({ ok: true, list: list.map(pub) });
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");

  if (action === "create") {
    const mine = await listMine(session);
    if (mine.length >= 200) return Response.json({ ok: false, error: "limit" }, { status: 400 });
    const row = {
      token: newToken(),
      title: String(b.title || "").trim().slice(0, 120) || "",
      ...normClient(b),
      note: String(b.note || "").trim().slice(0, 1000) || null,
      owner_email: session.id != null ? null : (session.email || null),
      owner_tg: session.id != null ? session.id : null,
      items: [],
    };
    const { data, error } = await supa.from("collections").insert(row).select("*").single();
    if (error || !data) return Response.json({ ok: false, error: "db" }, { status: 500 });
    return Response.json({ ok: true, item: pub(data) });
  }

  const c = await getById(String(b.id || ""));
  if (!c) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!isOwner(session, c)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  let patch = null;
  if (action === "update") {
    patch = {};
    if (b.title !== undefined) patch.title = String(b.title || "").trim().slice(0, 120);
    if (b.client_name !== undefined || b.client_phone !== undefined || b.client_tg !== undefined) {
      Object.assign(patch, normClient({ client_name: b.client_name ?? c.client_name, client_phone: b.client_phone ?? c.client_phone, client_tg: b.client_tg ?? c.client_tg }));
    }
    if (b.note !== undefined) patch.note = String(b.note || "").trim().slice(0, 1000) || null;
    if (b.enabled !== undefined) patch.enabled = !!b.enabled;
  } else if (action === "add" || action === "remove") {
    const lid = String(b.listingId || "");
    const items = (Array.isArray(c.items) ? c.items : []).filter((x) => x && x.id !== lid);
    if (action === "add") {
      if (items.length >= MAX_ITEMS) return Response.json({ ok: false, error: "limit" }, { status: 400 });
      // Берём объект из ПУБЛИЧНОЙ выдачи: снимок не содержит служебных полей и добавить можно
      // только то, что реально опубликовано.
      const u = (await getAllUnits()).find((x) => String(x.id) === lid);
      if (!u) return Response.json({ ok: false, error: "listing_not_found" }, { status: 404 });
      items.unshift(itemSnapshot(u));
    }
    patch = { items };
  } else if (action === "delete") {
    const { error } = await supa.from("collections").delete().eq("id", c.id);
    if (error) return Response.json({ ok: false, error: "db" }, { status: 500 });
    return Response.json({ ok: true });
  } else {
    return Response.json({ ok: false, error: "bad_action" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();
  const { data, error } = await supa.from("collections").update(patch).eq("id", c.id).select("*").single();
  if (error || !data) return Response.json({ ok: false, error: "db" }, { status: 500 });
  return Response.json({ ok: true, item: pub(data) });
}
