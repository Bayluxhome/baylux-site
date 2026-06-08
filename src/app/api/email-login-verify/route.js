import { supa } from "@/lib/supabase";
import { signSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  const fail = new Response(null, { status: 302, headers: { Location: "/my?login=fail" } });
  if (!token || !supa) return fail;
  const { data } = await supa.from("login_tokens").select("*").eq("token", token).maybeSingle();
  if (!data || !data.email) return fail;
  if (Date.now() - new Date(data.created_at).getTime() > 1800000) {
    await supa.from("login_tokens").delete().eq("token", token);
    return fail;
  }
  await supa.from("login_tokens").delete().eq("token", token);
  // Учёт пользователя + чтение прав сотрудника (для админ-доступа). Не ломаем вход при ошибке.
  let adminGrant = false;
  try {
    await supa.from("site_users").upsert({ email: data.email, name: data.email.split("@")[0], last_login: new Date().toISOString() }, { onConflict: "email" });
    const { data: su } = await supa.from("site_users").select("is_admin").eq("email", data.email).maybeSingle();
    adminGrant = !!su?.is_admin;
  } catch (e) { console.error("site_users email:", e?.message); }
  const session = signSession({ email: data.email, name: data.email.split("@")[0], ...(adminGrant ? { admin: true } : {}), exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const res = new Response(null, { status: 302, headers: { Location: "/my" } });
  res.headers.append("Set-Cookie", `bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  return res;
}
