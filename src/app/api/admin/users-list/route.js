import { cookies } from "next/headers";
import { verifySession, can } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Список зарегистрированных пользователей (email, Telegram-id, имя) — для назначения
// владельца/ответственного объекта. Это персональные данные, поэтому доступ только тем,
// кому он нужен по работе: право «Пользователи», «Модерация» или «Объекты в управлении».
export async function GET() {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!(can(s, "users") || can(s, "moderate") || can(s, "managed"))) return Response.json({ ok: false }, { status: 403 });
  if (!supa) return Response.json({ ok: true, users: [] });
  try {
    const { data } = await supa
      .from("site_users")
      .select("tg_user_id, email, name, username")
      .order("created_at", { ascending: false })
      .limit(500);
    return Response.json({ ok: true, users: data || [] });
  } catch (e) {
    return Response.json({ ok: true, users: [] });
  }
}
