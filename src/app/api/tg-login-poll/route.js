import { supa } from "@/lib/supabase";
import { signSession } from "@/lib/session";

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
  const session = signSession({ id: Number(data.tg_user_id), name: data.name || "", username: data.username || "", exp: Date.now() + 30 * 24 * 3600 * 1000 });
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", `bx_session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${30 * 24 * 3600}`);
  return res;
}
