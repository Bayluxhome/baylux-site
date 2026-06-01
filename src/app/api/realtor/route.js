import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Регистрация / обновление профиля риелтора текущим пользователем.
export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  const name = (b.name || session.name || "").toString().trim();
  if (!name) return Response.json({ ok: false, error: "name" }, { status: 400 });

  const row = {
    name,
    phone: (b.phone || "").toString().trim() || null,
    bio: (b.bio || "").toString().slice(0, 600) || null,
    photo: (b.photo || "").toString() || null,
    deal_types: (b.deal_types || "").toString() || null,
    lang: session.lang || "ru",
  };

  const byId = session.id != null;
  // есть ли уже профиль
  let q = supa.from("realtors").select("id");
  q = byId ? q.eq("tg_user_id", session.id) : q.eq("email", session.email);
  const { data: existing } = await q.maybeSingle();

  if (existing) {
    await supa.from("realtors").update(row).eq("id", existing.id);
  } else {
    await supa.from("realtors").insert({ ...row, tg_user_id: byId ? session.id : null, email: byId ? null : session.email });
  }
  return Response.json({ ok: true });
}

// Снять с себя статус риелтора.
export async function DELETE() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let q = supa.from("realtors").delete();
  q = session.id != null ? q.eq("tg_user_id", session.id) : q.eq("email", session.email);
  await q;
  return Response.json({ ok: true });
}
