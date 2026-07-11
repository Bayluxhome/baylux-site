import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SITE = "https://bayluxhome.com";
const ARCHIVE_DAYS = 60;

async function tg(method, body) {
  if (!TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) { /* ignore */ }
}

function text(lang, title) {
  const t = String(title || "объявление");
  if (lang === "en") return `🔔 Your listing "${t}" has been on the site for 60 days and moved to the archive.\n\nIf it's still relevant — renew it in your cabinet and it will be shown again for 60 days:\n${SITE}/my`;
  if (lang === "ka") return `🔔 თქვენი განცხადება "${t}" საიტზე 60 დღე იყო და გადავიდა არქივში.\n\nთუ ის ჯერ კიდევ აქტუალურია — განაახლეთ კაბინეტში და ის კვლავ გამოჩნდება 60 დღით:\n${SITE}/my`;
  return `🔔 Ваше объявление «${t}» пробыло на сайте 60 дней и ушло в архив.\n\nЕсли объект ещё актуален — поднимите его в личном кабинете, и оно снова будет висеть 60 дней:\n${SITE}/my`;
}

async function run(req) {
  // Защита: если задан CRON_SECRET — требуем Authorization: Bearer <CRON_SECRET> (Vercel Cron шлёт его сам).
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.get("authorization") || "") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!supa || !TOKEN) return Response.json({ ok: false, error: "not_configured" });

  // Окно: объявления, «свежесть» которых от 60 до 62 дней назад — т.е. ушли в архив за последние ~2 суток.
  // Так не шлём уведомления по старому накопленному архиву, только по свежеархивированным.
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 864e5).toISOString();
  const windowStart = new Date(Date.now() - (ARCHIVE_DAYS + 2) * 864e5).toISOString();

  const { data, error } = await supa
    .from("listings")
    .select("id, lang, building_name, name_ru, managed_by_baylux, tg_user_id, bumped_at, archive_notified")
    .eq("status", "approved")
    .not("tg_user_id", "is", null)
    .lt("bumped_at", cutoff)
    .gte("bumped_at", windowStart)
    .or("archive_notified.is.null,archive_notified.eq.false")
    .limit(300);
  if (error) return Response.json({ ok: false, error: error.message });

  let sent = 0;
  for (const r of data || []) {
    if (r.managed_by_baylux) continue; // объекты под управлением Baylux не архивируются
    await tg("sendMessage", { chat_id: r.tg_user_id, text: text(r.lang, r.building_name || r.name_ru), disable_web_page_preview: true });
    await supa.from("listings").update({ archive_notified: true }).eq("id", r.id);
    sent++;
  }
  return Response.json({ ok: true, sent });
}

export async function GET(req) { return run(req); }
export async function POST(req) { return run(req); }
