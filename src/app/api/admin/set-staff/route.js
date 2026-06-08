import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Назначить набор прав сотруднику. Доступно только главному админу (из конфига).
export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(s)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  // Принимаем только ключи из реестра — мусор отсекаем.
  const perms = Array.isArray(b.permissions) ? [...new Set(b.permissions.filter((p) => PERMISSION_KEYS.includes(p)))] : [];
  const patch = { permissions: perms, is_admin: perms.length > 0 };

  let q = supa.from("site_users").update(patch);
  if (b.email) q = q.eq("email", b.email);
  else if (b.tg_user_id != null) q = q.eq("tg_user_id", Number(b.tg_user_id));
  else return Response.json({ ok: false, error: "target" }, { status: 400 });
  const { error } = await q;
  if (error) return Response.json({ ok: false });
  return Response.json({ ok: true, permissions: perms });
}
