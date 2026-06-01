import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Право на удаление (ст. ПД-закона Грузии / GDPR).
// Объявления не удаляем жёстко, а обезличиваем: снимаем с публикации и
// стираем персональные/контактные данные владельца. Это сохраняет целостность
// данных площадки и одновременно убирает персональные данные пользователя.
export async function POST() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });

  const byId = session.id != null;

  // 1. Обезличиваем объявления пользователя
  const anonymize = {
    status: "rejected",
    contact: null,
    phone: null,
    tg_username: null,
    owner_email: null,
    tg_user_id: null,
  };
  let lq = supa.from("listings").update(anonymize);
  lq = byId ? lq.eq("tg_user_id", session.id) : lq.eq("owner_email", session.email);
  await lq;

  // 2. Удаляем профиль пользователя
  if (byId) {
    await supa.from("users").delete().eq("tg_user_id", session.id);
  }

  // 3. Журнал согласий помечаем отзывом (запись об отзыве согласия — тоже требование закона)
  try {
    await supa.from("user_consents").insert(
      byId
        ? { tg_user_id: session.id, consent_type: "withdrawn", accepted_at: new Date().toISOString() }
        : { email: session.email, consent_type: "withdrawn", accepted_at: new Date().toISOString() }
    );
  } catch (e) { /* ignore */ }

  // 4. Чистим сессию
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", "bx_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return res;
}
