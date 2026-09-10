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
import { listMine, getById, isOwner, newToken, normClient, itemSnapshot, pickableUnits, MAX_ITEMS } from "@/lib/collections";
import { getClient, ownsClient } from "@/lib/clients";
import { getRole, canCrm } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const pub = (c) => ({
  id: c.id, token: c.token, title: c.title, client_name: c.client_name, client_phone: c.client_phone, client_tg: c.client_tg,
  note: c.note, items: Array.isArray(c.items) ? c.items : [], enabled: c.enabled, created_at: c.created_at, updated_at: c.updated_at,
});

// Компактная строка объекта для экрана выбора (без описаний и лишних фото).
const pickRow = (u) => ({
  id: String(u.id), slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area,
  price: u.price, priceNum: u.priceNum, currency: u.currency, per: u.per,
  img: u.unit_image || (u.photos && u.photos[0]) || u.img || "",
  address: u.building?.name || "", city: u.building?.district || "", created_at: u.created_at,
});

// GET            — мои подборки
// GET ?pick=<id> — объекты, которые текущий пользователь может добавить в подборку <id>
//                  (только свои + инвентарь Baylux; фильтр — на сервере, не в интерфейсе)
export async function GET(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!canCrm(await getRole(session))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 }); // подборки — только риелтор/сотрудник
  const pickFor = new URL(req.url).searchParams.get("pick");
  if (pickFor) {
    const c = await getById(pickFor);
    if (!c) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
    if (!isOwner(session, c)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
    const units = await pickableUnits(session);
    const inColl = new Set((Array.isArray(c.items) ? c.items : []).map((i) => i.id));
    return Response.json({ ok: true, collection: pub(c), units: units.map((u) => ({ ...pickRow(u), added: inColl.has(String(u.id)) })) });
  }
  const list = await listMine(session);
  return Response.json({ ok: true, list: list.map(pub) });
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!canCrm(await getRole(session))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 }); // подборки — только риелтор/сотрудник
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
    // Привязка к карточке клиента — только если клиент принадлежит текущему пользователю.
    if (b.client_id) {
      const cl = await getClient(String(b.client_id));
      if (cl && ownsClient(session, cl)) row.client_id = cl.id;
    }
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
  } else if (action === "add" || action === "addMany") {
    // Принадлежность проверяется ЗДЕСЬ, по серверной сессии: каждый переданный id должен быть
    // в списке доступных текущему пользователю (свои + инвентарь Baylux). Чужой или
    // несуществующий id → в ответе rejected, в подборку не попадает. Подмена id в запросе не работает.
    const ids = [...new Set((action === "add" ? [b.listingId] : (Array.isArray(b.listingIds) ? b.listingIds : [])).map((x) => String(x || "")).filter(Boolean))].slice(0, MAX_ITEMS);
    if (!ids.length) return Response.json({ ok: false, error: "no_ids" }, { status: 400 });
    const allowed = new Map((await pickableUnits(session)).map((u) => [String(u.id), u]));
    const items = Array.isArray(c.items) ? c.items.filter(Boolean) : [];
    const have = new Set(items.map((x) => x.id));
    const rejected = [], added = [];
    for (const id of ids) {
      const u = allowed.get(id);
      if (!u) { rejected.push(id); continue; }
      if (have.has(id)) continue;                       // повтор — дубликат не создаём
      if (items.length >= MAX_ITEMS) { rejected.push(id); continue; }
      items.push(itemSnapshot(u)); have.add(id); added.push(id);
    }
    if (action === "add" && rejected.length) return Response.json({ ok: false, error: "forbidden_listing" }, { status: 403 });
    patch = { items };
    b._meta = { added: added.length, rejected: rejected.length, skipped: ids.length - added.length - rejected.length };
  } else if (action === "remove") {
    const lid = String(b.listingId || "");
    patch = { items: (Array.isArray(c.items) ? c.items : []).filter((x) => x && x.id !== lid) };
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
  return Response.json({ ok: true, item: pub(data), ...(b._meta || {}) });
}
