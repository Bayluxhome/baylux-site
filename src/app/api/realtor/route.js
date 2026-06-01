import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
}

// Регистрация / обновление профиля риелтора. Профиль уходит на модерацию (status=pending).
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
    status: "pending",
  };

  const byId = session.id != null;
  let q = supa.from("realtors").select("id");
  q = byId ? q.eq("tg_user_id", session.id) : q.eq("email", session.email);
  const { data: existing } = await q.maybeSingle();

  let realtorId;
  if (existing) {
    await supa.from("realtors").update(row).eq("id", existing.id);
    realtorId = existing.id;
  } else {
    const { data: ins } = await supa.from("realtors").insert({ ...row, tg_user_id: byId ? session.id : null, email: byId ? null : session.email }).select("id").single();
    realtorId = ins?.id;
  }

  // Заявка админу в Telegram с кнопками модерации
  if (ADMIN && TOKEN && realtorId) {
    const who = byId ? `tg:${session.id}` : session.email;
    const summary = `👤 <b>Заявка риелтора (на модерацию)</b>\nИмя: ${esc(name)}\nТел: ${esc(row.phone || "—")}\nСпец.: ${esc(row.deal_types || "—")}\nАккаунт: ${esc(who)}\n\n${esc(row.bio || "")}`;
    if (row.photo) await tg("sendPhoto", { chat_id: ADMIN, photo: row.photo, caption: summary, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Одобрить", callback_data: `rap:${realtorId}` }, { text: "❌ Отклонить", callback_data: `rrj:${realtorId}` }]] } });
    else await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Одобрить", callback_data: `rap:${realtorId}` }, { text: "❌ Отклонить", callback_data: `rrj:${realtorId}` }]] } });
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
