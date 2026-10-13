import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { normPhone, normTg } from "@/lib/contacts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Контакты профиля для объявлений (13.10.2026). Только текущий пользователь по серверной сессии —
// чужой id/email с клиента не принимаются. Хранение: site_users.phone + site_users.contact_tg
// (sql/026). Телефон риелтора (realtors.phone) и телефон из бота (users.phone) — запасные
// источники при чтении, чтобы уже известный номер не пришлось вводить заново.

const keyOf = (s) => (s.id != null ? { col: "tg_user_id", val: Number(s.id) } : { col: "email", val: String(s.email || "").toLowerCase() });

async function readContacts(s) {
  const k = keyOf(s);
  const { data: su } = await supa.from("site_users").select("*").eq(k.col, k.val).maybeSingle();
  let phone = su?.phone || "";
  if (!phone) {
    const { data: r } = await supa.from("realtors").select("phone").eq(k.col, k.val).maybeSingle();
    phone = r?.phone || "";
  }
  if (!phone && s.id != null) {
    const { data: u } = await supa.from("users").select("phone").eq("tg_user_id", Number(s.id)).maybeSingle();
    phone = u?.phone || "";
  }
  const tg = su?.contact_tg || (s.username ? normTg(s.username) || "" : "");
  return { phone: normPhone(phone) || "", tg };
}

export async function GET() {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!s) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  try { return Response.json({ ok: true, ...(await readContacts(s)) }); }
  catch (e) { console.error("profile-contacts get:", e?.message); return Response.json({ ok: false }, { status: 500 }); }
}

export async function POST(req) {
  const s = verifySession(cookies().get("bx_session")?.value);
  if (!s) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false, error: "bad" }, { status: 400 }); }
  const phone = normPhone(b.phone);
  if (!phone) return Response.json({ ok: false, error: "phone" }, { status: 400 });
  const tg = normTg(b.tg);
  if (tg === null) return Response.json({ ok: false, error: "tg" }, { status: 400 });

  const k = keyOf(s);
  const row = { [k.col]: k.val, phone, contact_tg: tg || null };
  const { error } = await supa.from("site_users").upsert(row, { onConflict: k.col });
  if (error) {
    console.error("profile-contacts save:", error.message);
    // Колонки contact_tg ещё нет (не применён sql/026) — сохраняем хотя бы телефон.
    if (/contact_tg/.test(error.message)) {
      const { error: e2 } = await supa.from("site_users").upsert({ [k.col]: k.val, phone }, { onConflict: k.col });
      if (e2) return Response.json({ ok: false }, { status: 500 });
      return Response.json({ ok: true, phone, tg: "", warn: "tg_not_saved" });
    }
    return Response.json({ ok: false }, { status: 500 });
  }
  // Телефон риелтора — тот же номер (единый источник): обновляем карточку риелтора, если она есть.
  try { await supa.from("realtors").update({ phone }).eq(k.col, k.val); } catch { /* не критично */ }
  return Response.json({ ok: true, phone, tg });
}
