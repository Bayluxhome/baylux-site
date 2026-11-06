// 06.11.2026: жалоба на объявление. Без входа. Одна жалоба с одного IP на объявление.
// Каждая жалоба — уведомление админу в Telegram. 2 жалобы bad/fake от разных IP → скрываем объявление
// (status pending), удаляем пост из TG-канала, админ решает в боте/админке.
import { createHash } from "crypto";
import { supa } from "@/lib/supabase";
import { revalidateListings } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const REASONS = { bad: "непристойное / оскорбительное", fake: "фейк / мошенничество", sold: "уже продано / сдано", other: "другое" };
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://bayluxhome.com";
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tg = (method, body) => fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null);

export async function POST(req) {
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b; try { b = await req.json(); } catch { return Response.json({ ok: false }, { status: 400 }); }
  const id = String(b.id || "").slice(0, 64);
  const reason = REASONS[b.reason] ? b.reason : null;
  if (!id || !reason) return Response.json({ ok: false }, { status: 400 });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ip_hash = createHash("sha256").update("bx-report:" + ip).digest("hex").slice(0, 32);

  const { data: row } = await supa.from("listings").select("id,status,building_name,price,deal,type,tg_post_id,tg_channel").eq("id", id).maybeSingle();
  if (!row) return Response.json({ ok: false }, { status: 404 });

  const { error } = await supa.from("listing_reports").insert({ listing_id: id, reason, ip_hash });
  if (error) return Response.json({ ok: true, dup: true }); // уже жаловался с этого IP — молча ок

  const { data: reps } = await supa.from("listing_reports").select("reason,ip_hash").eq("listing_id", id);
  const serious = new Set((reps || []).filter((r) => r.reason === "bad" || r.reason === "fake").map((r) => r.ip_hash)).size;
  let hidden = false;
  if (serious >= 2 && row.status === "approved") {
    await supa.from("listings").update({ status: "pending" }).eq("id", id);
    if (TOKEN && row.tg_channel && row.tg_post_id) {
      for (const mid of String(row.tg_post_id).split(",")) await tg("deleteMessage", { chat_id: row.tg_channel, message_id: Number(mid) });
      await supa.from("listings").update({ tg_post_id: null }).eq("id", id);
    }
    revalidateListings();
    hidden = true;
  }
  if (TOKEN && ADMIN) {
    const text = `🚩 <b>Жалоба на объявление</b>${hidden ? "\n⛔ <b>Скрыто автоматически</b> (2+ серьёзные жалобы) — проверьте и одобрите или отклоните" : ""}\nПричина: ${esc(REASONS[reason])}\nВсего жалоб: ${(reps || []).length}\n${esc(row.deal || "")} · ${esc(row.type || "")} · ${esc(row.building_name || "")} · ${esc(row.price || "")}\nid: <code>${esc(id)}</code>\n${SITE}/ru/admin`;
    await tg("sendMessage", { chat_id: ADMIN, text, parse_mode: "HTML", disable_web_page_preview: true });
  }
  return Response.json({ ok: true, hidden });
}
