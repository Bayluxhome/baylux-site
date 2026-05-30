import { verifyTelegramAuth, signSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const data = verifyTelegramAuth(params);
  if (!data) return new Response("Авторизация не прошла. Попробуйте снова.", { status: 401 });

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
