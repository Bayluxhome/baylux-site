// Клиенты риелтора (кабинет, этап 1).
//   GET                         — мои клиенты (сотрудник с правом «Заявки» — все)
//   POST {action:"create", ...} — создать
//   POST {action:"update", id, ...поля}
//   POST {action:"note", id, body}   — добавить заметку
//   POST {action:"delete", id}
// Право на запись — владелец клиента (или тот, кто видит всех); проверяется на сервере.
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { listClients, getClient, ownsClient, normClientFields, pubClient, seesAll } from "@/lib/clients";
import { getRole, canCrm } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const who = (s) => s.email || (s.id != null ? `tg:${s.id}` : "?");

export async function GET() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!canCrm(await getRole(session))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 }); // CRM — только риелтор/сотрудник
  const list = await listClients(session);
  return Response.json({ ok: true, list: list.map(pubClient), seesAll: seesAll(session) });
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!canCrm(await getRole(session))) return Response.json({ ok: false, error: "forbidden" }, { status: 403 }); // CRM — только риелтор/сотрудник
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const action = String(b.action || "");

  if (action === "create") {
    const f = normClientFields(b);
    if (!f.name) return Response.json({ ok: false, error: "name" }, { status: 400 });
    const row = { ...f, owner_email: session.id != null ? null : (session.email || null), owner_tg: session.id != null ? session.id : null };
    const { data, error } = await supa.from("clients").insert(row).select("*").single();
    if (error || !data) return Response.json({ ok: false, error: "db" }, { status: 500 });
    return Response.json({ ok: true, item: pubClient(data) });
  }

  const c = await getClient(String(b.id || ""));
  if (!c) return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  if (!ownsClient(session, c)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  if (action === "update") {
    const f = normClientFields(b);
    if (f.name === "") delete f.name;
    // Смена ответственного — только тем, кто видит всех (ТЗ: «только с соответствующими правами»).
    if (b.owner !== undefined && seesAll(session)) {
      const o = String(b.owner || "").trim();
      if (/^tg:\d+$/.test(o)) { f.owner_tg = Number(o.slice(3)); f.owner_email = null; }
      else if (o.includes("@")) { f.owner_email = o.toLowerCase(); f.owner_tg = null; }
    }
    f.updated_at = new Date().toISOString();
    const { data, error } = await supa.from("clients").update(f).eq("id", c.id).select("*").single();
    if (error || !data) return Response.json({ ok: false, error: "db" }, { status: 500 });
    return Response.json({ ok: true, item: pubClient(data) });
  }
  if (action === "note") {
    const body = String(b.body || "").trim().slice(0, 2000);
    if (!body) return Response.json({ ok: false, error: "empty" }, { status: 400 });
    const { data, error } = await supa.from("client_notes").insert({ client_id: c.id, body, author: who(session) }).select("*").single();
    if (error || !data) return Response.json({ ok: false, error: "db" }, { status: 500 });
    await supa.from("clients").update({ updated_at: new Date().toISOString() }).eq("id", c.id);
    return Response.json({ ok: true, note: data });
  }
  if (action === "delete") {
    const { error } = await supa.from("clients").delete().eq("id", c.id);
    if (error) return Response.json({ ok: false, error: "db" }, { status: 500 });
    return Response.json({ ok: true });
  }
  return Response.json({ ok: false, error: "bad_action" }, { status: 400 });
}
