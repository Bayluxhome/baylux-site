import { supa } from "@/lib/supabase";
import { signSession } from "@/lib/session";
import { DOC_VERSION } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || !supa) return Response.json({ ok: false });
  const { data } = await supa.from("login_tokens").select("*").eq("token", token).maybeSingle();
  if (!data) return Response.json({ ok: false });
  if (Date.now() - new Date(data.created_at).getTime() > 600000) {
    await supa.from("login_tokens").delete().eq("token", token);
    return Response.json({ ok: false, expired: true });
  }
  if (!data.tg_user_id) return Response.json({ ok: false });
  await supa.from("login_tokens").delete().eq("token", token);
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    await supa.from("user_consents").insert({ tg_user_id: Number(data.tg_user_id), consent_type: "privacy", doc_version: DOC_VERSION, ip });
  } catch (e) { console.error("consent log:", e?.message); }
  // 12.10.2026: вход через бота не записывал пользователя в site_users и не читал права сотрудника —
  // поэтому «регистрация через Telegram не работала»: человек не появлялся в «Пользователях» и
  // аналитике, а сотрудник входил без своих прав. Теперь — как во входе через виджет (api/tg-auth).
  const uid = Number(data.tg_user_id);
  let perms = [];
  try {
    await supa.from("site_users").upsert({ tg_user_id: uid, username: data.username || "", name: data.name || "", last_login: new Date().toISOString() }, { onConflict: "tg_user_id" });
    const { data: su } = await supa.from("site_users").select("permissions, is_admin").eq("tg_user_id", uid).maybeSingle();
    perms = Array.isArray(su?.permissions) && su.permissions.length ? su.permissions : (su?.is_admin ? ["moderate", "managed", "news", "realtors", "users"] : []);
  } catch (e) { console.error("site_users tg-bot:", e?.message); }
  const session = signSession({ id: uid, name: data.name || "", username: data.username || "", ...(perms.length ? { perms } : {}), exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  return res;
}
