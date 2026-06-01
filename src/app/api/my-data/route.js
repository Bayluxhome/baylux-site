import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Право на доступ к данным (ст. ПД-закона Грузии / GDPR): отдаём пользователю
// все его данные одним JSON-файлом для скачивания.
export async function GET() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  const byId = session.id != null;
  const idVal = byId ? session.id : session.email;

  // профиль пользователя
  let profile = null;
  if (byId) {
    const { data } = await supa.from("users").select("*").eq("tg_user_id", session.id).maybeSingle();
    profile = data || null;
  }

  // объявления
  let lq = supa.from("listings").select("*");
  lq = byId ? lq.eq("tg_user_id", session.id) : lq.eq("owner_email", session.email);
  const { data: listings } = await lq.order("created_at", { ascending: false });

  // журнал согласий
  let cq = supa.from("user_consents").select("*");
  cq = byId ? cq.eq("tg_user_id", session.id) : cq.eq("email", session.email);
  const { data: consents } = await cq.order("accepted_at", { ascending: false });

  const payload = {
    exported_at: new Date().toISOString(),
    account: byId
      ? { type: "telegram", tg_user_id: session.id, name: session.name || null, username: session.username || null }
      : { type: "email", email: session.email, name: session.name || null },
    profile,
    listings: listings || [],
    consents: consents || [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="baylux-my-data-${idVal}.json"`,
    },
  });
}
