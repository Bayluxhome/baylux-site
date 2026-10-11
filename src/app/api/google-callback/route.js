import { supa } from "@/lib/supabase";
import { signSession } from "@/lib/session";
import { DOC_VERSION, SITE_URL } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Вход через Google — шаг 2: Google вернул code → меняем на токен, берём подтверждённый email.
// Дальше всё как во входе по ссылке на почту: тот же site_users (по email), те же права,
// та же cookie bx_session. Поэтому человек, входивший раньше по почте, попадает в свой же кабинет.

const clearState = "bx_gstate=; Path=/api/google-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const go = (loc, cookies = []) => {
  const res = new Response(null, { status: 302, headers: { Location: loc } });
  [clearState, ...cookies].forEach((c) => res.headers.append("Set-Cookie", c));
  return res;
};

export async function GET(req) {
  const url = new URL(req.url);
  const fail = () => go("/my?login=fail");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !supa) return fail();

  // Сверяем state с cookie (защита от подделки запроса)
  let saved = null;
  try {
    const raw = (req.headers.get("cookie") || "").split(/;\s*/).find((c) => c.startsWith("bx_gstate="));
    saved = raw ? JSON.parse(decodeURIComponent(raw.slice("bx_gstate=".length))) : null;
  } catch { saved = null; }
  if (!saved || saved.s !== state) return fail();

  let email = "", name = "";
  try {
    const tr = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: `${SITE_URL}/api/google-callback`,
        grant_type: "authorization_code",
      }),
    });
    const tok = await tr.json();
    if (!tr.ok || !tok.access_token) { console.error("google token:", tok?.error); return fail(); }
    // Профиль берём напрямую у Google по access_token (сервер→сервер по TLS), без разбора JWT.
    const ur = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
    const info = await ur.json();
    if (!ur.ok || !info.email || info.email_verified !== true) return fail();
    email = String(info.email).trim().toLowerCase();
    name = String(info.name || info.given_name || email.split("@")[0]).slice(0, 80);
  } catch (e) {
    console.error("google login:", e?.message);
    return fail();
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  // Согласие: кнопка Google активна только после галочки согласия (LoginBlock) — фиксируем его.
  try {
    const consents = [{ email, consent_type: "privacy", doc_version: DOC_VERSION, ip }];
    if (saved.m === "1") consents.push({ email, consent_type: "marketing", doc_version: DOC_VERSION, ip });
    await supa.from("user_consents").insert(consents);
  } catch (e) { console.error("consent log:", e?.message); }

  let perms = [];
  try {
    const { data: ex } = await supa.from("site_users").select("id, name").eq("email", email).maybeSingle();
    await supa.from("site_users").upsert({ email, name: ex?.name || name, last_login: new Date().toISOString() }, { onConflict: "email" });
    const { data: su } = await supa.from("site_users").select("permissions, is_admin, name").eq("email", email).maybeSingle();
    perms = Array.isArray(su?.permissions) && su.permissions.length ? su.permissions : (su?.is_admin ? ["moderate", "managed", "news", "realtors", "users"] : []);
    if (su?.name) name = su.name;
  } catch (e) { console.error("site_users google:", e?.message); }

  const session = signSession({ email, name, ...(perms.length ? { perms } : {}), exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const next = typeof saved.n === "string" && /^\/(?!\/)/.test(saved.n) ? saved.n : "/my";
  return go(`${SITE_URL}${next}`, [`bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`]);
}
