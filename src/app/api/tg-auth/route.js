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

  const session = signSession({
    id: Number(data.id),
    name: data.first_name || "",
    username: data.username || "",
    exp: Date.now() + 30 * 24 * 3600 * 1000,
  });

  const res = new Response(null, { status: 302, headers: { Location: "/my" } });
  res.headers.append("Set-Cookie", `bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  return res;
}
