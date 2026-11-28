// Раздел «Заявки» в админке (T-20261128-02): статус, ответственный, комментарий сотрудника.
// Право — «Заявки клиентов» (leads). Заявки не удаляются: только меняются поля.
// Колонки manager / staff_note добавляет sql/038_leads_manager_note.sql; пока он не выполнен,
// статус меняется как раньше, а на ответственного/комментарий отвечаем sql_needed.
import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "in_work", "done"];
const MANAGERS = ["", "dmitry", "tatiana"];

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!can(session, "leads")) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });

  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "").slice(0, 100);
  if (!id) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });

  const who = session.email || (session.id != null ? `tg:${session.id}` : "?");
  const now = new Date().toISOString();

  // 1) статус — колонки есть всегда (sql/017, 020)
  if (b.status !== undefined) {
    const status = String(b.status);
    if (!STATUSES.includes(status)) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
    const { error } = await supa.from("leads").update({ status, handled_by: who, handled_at: now }).eq("id", id);
    if (error) return Response.json({ ok: false, error: "db" }, { status: 500 });
  }

  // 2) ответственный и комментарий — колонки из sql/038
  const patch = {};
  if (b.manager !== undefined) {
    const m = String(b.manager || "");
    if (!MANAGERS.includes(m)) return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
    patch.manager = m || null;
  }
  if (b.note !== undefined) {
    patch.staff_note = String(b.note || "").trim().slice(0, 2000) || null;
    patch.staff_note_at = now;
  }
  if (Object.keys(patch).length) {
    const { error } = await supa.from("leads").update(patch).eq("id", id);
    if (error) {
      const noCol = /column|schema cache|staff_note|manager/i.test(String(error.message || ""));
      return Response.json({ ok: false, error: noCol ? "sql_needed" : "db" }, { status: noCol ? 409 : 500 });
    }
  }
  return Response.json({ ok: true });
}
