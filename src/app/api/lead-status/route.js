// Смена статуса заявки из кабинета: new → in_work → done (задача №03).
// Право — на сервере: владелец объявления, назначенный ответственный или сотрудник с правом «Заявки».
import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "in_work", "done"];

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  const status = String(b.status || "");
  if (!id || !STATUSES.includes(status)) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });

  const { data: lead } = await supa.from("leads").select("id, owner_email, owner_tg, assigned_email, assigned_tg").eq("id", id).maybeSingle();
  if (!lead) return Response.json({ ok: false, error: "not_found" }, { status: 404 });

  const em = (v) => String(v || "").toLowerCase();
  const mine =
    (session.id != null && (String(lead.owner_tg) === String(session.id) || String(lead.assigned_tg) === String(session.id))) ||
    (session.email && (em(lead.owner_email) === em(session.email) || em(lead.assigned_email) === em(session.email)));
  if (!mine && !can(session, "leads")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const who = session.email || (session.id != null ? `tg:${session.id}` : "?");
  const { error } = await supa.from("leads").update({ status, handled_by: who, handled_at: new Date().toISOString() }).eq("id", id);
  if (error) return Response.json({ ok: false, error: "db" }, { status: 500 });
  return Response.json({ ok: true });
}
