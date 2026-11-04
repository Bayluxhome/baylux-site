// «Baylux Показы»: агент ↔ команда через бота в Telegram-группе.
//   POST {action:"card", text, ref}  — бот отправляет карточку в группу, карточка сохраняется.
//   GET                               — необработанные ответы команды (reply на карточки бота).
//   POST {action:"done", ids:[...]}   — отметить ответы обработанными.
// Доступ: только админ-сессия сайта (агент вызывает из браузера, где выполнен вход).
import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEAM_CHAT = Number(process.env.TELEGRAM_TEAM_CHAT_ID || -5290106439);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function guard() {
  const s = verifySession(cookies().get("bx_session")?.value);
  return isAdmin(s);
}

export async function GET() {
  if (!guard()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  const { data, error } = await supa
    .from("team_replies")
    .select("id, created_at, from_name, from_username, text, card:team_cards(id, ref, text)")
    .is("processed_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, replies: data || [] });
}

export async function POST(req) {
  if (!guard()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa || !TOKEN) return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false, error: "json" }, { status: 400 }); }

  if (b.action === "card") {
    const text = String(b.text || "").trim().slice(0, 3800);
    if (!text) return Response.json({ ok: false, error: "empty" }, { status: 400 });
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TEAM_CHAT, text: text + "\n\n↩️ Ответьте на это сообщение (reply) — агент передаст клиенту.", disable_web_page_preview: true }),
    }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) return Response.json({ ok: false, error: r?.description || "tg_failed" }, { status: 502 });
    const { data } = await supa.from("team_cards")
      .insert({ chat_id: TEAM_CHAT, message_id: r.result.message_id, ref: b.ref ? String(b.ref).slice(0, 200) : null, text })
      .select("id").single();
    return Response.json({ ok: true, card_id: data?.id, message_id: r.result.message_id });
  }

  if (b.action === "done") {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Boolean);
    if (!ids.length) return Response.json({ ok: false, error: "ids" }, { status: 400 });
    const { error } = await supa.from("team_replies").update({ processed_at: new Date().toISOString() }).in("id", ids);
    return Response.json({ ok: !error });
  }

  return Response.json({ ok: false, error: "action" }, { status: 400 });
}
