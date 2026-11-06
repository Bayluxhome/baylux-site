// «Baylux Показы»: агент ↔ команда через бота в Telegram-группе.
//   POST {action:"card", text, ref}  — бот отправляет карточку в группу, карточка сохраняется.
//   GET                               — необработанные ответы команды (reply на карточки бота).
//   POST {action:"done", ids:[...]}   — отметить ответы обработанными.
// Доступ: только админ-сессия сайта (агент вызывает из браузера, где выполнен вход).
import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { publishApproved } from "@/lib/autoModeration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TEAM_CHAT = Number(process.env.TELEGRAM_TEAM_CHAT_ID || -5290106439);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function guard() {
  const s = verifySession(cookies().get("bx_session")?.value);
  return isAdmin(s);
}

export async function GET(req) {
  if (!guard()) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  // 06.11: скачать голосовое/файл из группы по file_id (для расшифровки агентом): GET /api/team?file=<file_id>
  const fileId = req ? new URL(req.url).searchParams.get("file") : null;
  if (fileId) {
    if (!TOKEN) return Response.json({ ok: false, error: "not_configured" }, { status: 500 });
    const g = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${encodeURIComponent(fileId)}`).then((r) => r.json()).catch(() => null);
    const fp = g?.result?.file_path;
    if (!fp) return Response.json({ ok: false, error: "file" }, { status: 404 });
    const f = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${fp}`);
    if (!f.ok) return Response.json({ ok: false, error: "download" }, { status: 502 });
    const name = fp.split("/").pop() || "file";
    return new Response(f.body, { headers: { "Content-Type": f.headers.get("content-type") || "application/octet-stream", "Content-Disposition": `attachment; filename="${name}"` } });
  }
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

  // Перевыложить одобренное объявление в TG-канал, если поста ещё нет (tg_post_id пуст).
  if (b.action === "channel") {
    const id = String(b.id || "").trim();
    if (!id) return Response.json({ ok: false, error: "id" }, { status: 400 });
    await publishApproved(id);
    const { data } = await supa.from("listings").select("tg_post_id, tg_channel").eq("id", id).maybeSingle();
    return Response.json({ ok: !!data?.tg_post_id, tg_post_id: data?.tg_post_id || null, tg_channel: data?.tg_channel || null });
  }

  return Response.json({ ok: false, error: "action" }, { status: 400 });
}
