import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Выдать/снять админ-права сотруднику. Доступно только главному админу (из конфига).
export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(s)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  const isAdm = !!b.isAdmin;
  let q = supa.from("site_users").update({ is_admin: isAdm });
  if (b.email) q = q.eq("email", b.email);
  else if (b.tg_user_id != null) q = q.eq("tg_user_id", Number(b.tg_user_id));
  else return Response.json({ ok: false, error: "target" }, { status: 400 });
  const { error } = await q;
  if (error) return Response.json({ ok: false });
  return Response.json({ ok: true });
}
