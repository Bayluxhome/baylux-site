import { randomBytes } from "crypto";
import { SITE_URL } from "@/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Вход через Google (11.10.2026) — шаг 1: уводим на страницу выбора аккаунта Google.
// Нужны переменные окружения GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET (Google Cloud → OAuth client,
// тип «Web application», redirect URI: https://bayluxhome.com/api/google-callback).
// state + флаг маркетинга + адрес возврата кладём в короткоживущую httpOnly-cookie (защита от CSRF).

// Возврат только на свои страницы: относительный путь, без «//» (иначе открытый редирект).
const safeNext = (p) => (typeof p === "string" && /^\/(?!\/)[\w\-./?=&#%]*$/.test(p) ? p : "/my");

export async function GET(req) {
  const url = new URL(req.url);
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id || !process.env.GOOGLE_CLIENT_SECRET) {
    return new Response(null, { status: 302, headers: { Location: "/my?login=google_off" } });
  }
  const state = randomBytes(16).toString("hex");
  const marketing = url.searchParams.get("m") === "1" ? "1" : "0";
  const next = safeNext(url.searchParams.get("next"));
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: id,
    redirect_uri: `${SITE_URL}/api/google-callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  const cookieVal = encodeURIComponent(JSON.stringify({ s: state, m: marketing, n: next }));
  const res = new Response(null, { status: 302, headers: { Location: auth.toString() } });
  res.headers.append("Set-Cookie", `bx_gstate=${cookieVal}; Path=/api/google-callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  return res;
}
