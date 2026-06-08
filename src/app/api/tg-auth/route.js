import { verifyTelegramAuth, signSession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { DOC_VERSION } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const data = verifyTelegramAuth(params);
  if (!data) return new Response("Авторизация не прошла. Попробуйте снова.", { status: 401 });

  try {
    if (supa) {
      const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      await supa.from("user_consents").insert({ tg_user_id: Number(data.id), consent_type: "privacy", doc_version: DOC_VERSION, ip });
    }
  } catch (e) { console.error("consent log:", e?.message); }

  // Учёт пользователя (для админ-раздела «Пользователи»). Не ломаем вход при ошибке.
  let adminGrant = false;
  try {
    if (supa) {
      await supa.from("site_users").upsert({ tg_user_id: Number(data.id), username: data.username || "", name: data.first_name || "", last_login: new Date().toISOString() }, { onConflict: "tg_user_id" });
      const { data: su } = await supa.from("site_users").select("is_admin").eq("tg_user_id", Number(data.id)).maybeSingle();
      adminGrant = !!su?.is_admin;
    }
  } catch (e) { console.error("site_users tg:", e?.message); }

  const session = signSession({
    id: Number(data.id),
    name: data.first_name || "",
    username: data.username || "",
    ...(adminGrant ? { admin: true } : {}),
    exp: Date.now() + 30 * 24 * 3600 * 1000,
  });

  const res = new Response(null, { status: 302, headers: { Location: "/my" } });
  res.headers.append("Set-Cookie", `bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  return res;
}
