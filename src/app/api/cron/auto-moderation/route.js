// T-20261118-04 (18.11.2026): серверная автомодерация объявлений «на модерации» (status=pending).
// Vercel Cron каждые 20 мин (vercel.json) или вызов с admin-сессией (право «moderate»), напр. из upload_to_site.py.
// Проверка: lib/autoModeration.moderationVerdict (фото, дубли, цена, стоп-слова, рецидивисты) + Haiku по тексту.
// AUTO_MOD_MODE=shadow|on (по умолчанию shadow):
//   shadow — решение только в журнал (auto_mod_log) и в сводку, статус НЕ меняется;
//   on     — чистые публикуются (как кнопка «Опубликовать»: перевод, пост в канал), спорные остаются pending.
// Удаления/отклонения нет вообще. Одна сводка за запуск в чат модерации (TELEGRAM_CHAT_ID), только если что-то проверено.
import { cookies } from "next/headers";
import { supa } from "@/lib/supabase";
import { verifySession, can } from "@/lib/session";
import { moderationVerdict, publishApproved, reasonsText } from "@/lib/autoModeration";
import { reviewListingText, aiFlagsText } from "@/lib/haikuListing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const SITE = "https://bayluxhome.com";
const PER_RUN = 15;              // не больше объявлений за запуск (Haiku + фото-проверка ~5 с на объект)
const LOOKBACK_DAYS = 3;         // с таблицей журнала: pending за последние 3 дня, ещё не проверенные
const WINDOW_MIN = 45;           // без таблицы: только созданные за последние 45 мин (cron 20 мин — с перекрытием)
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.get("authorization") || "") === `Bearer ${secret}`) return true;
  const session = verifySession(cookies().get("bx_session")?.value);
  return !!session && can(session, "moderate");
}

async function run(req) {
  if (!authorized(req)) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" });
  const mode = process.env.AUTO_MOD_MODE === "on" ? "on" : "shadow";

  // Есть ли журнал (sql/036_auto_mod_log.sql)?
  let hasLog = true;
  const probe = await supa.from("auto_mod_log").select("id", { head: true, count: "exact" }).limit(1);
  if (probe.error) hasLog = false;

  const since = new Date(Date.now() - (hasLog ? LOOKBACK_DAYS * 1440 : WINDOW_MIN) * 6e4).toISOString();
  const { data: rows, error } = await supa.from("listings").select("*")
    .eq("status", "pending").gte("created_at", since).order("created_at", { ascending: true }).limit(200);
  if (error) return Response.json({ ok: false, error: error.message });

  let todo = rows || [];
  if (hasLog && todo.length) {
    const { data: done } = await supa.from("auto_mod_log").select("listing_id").in("listing_id", todo.map((r) => r.id));
    const seen = new Set((done || []).map((d) => String(d.listing_id)));
    todo = todo.filter((r) => !seen.has(String(r.id)));
  }
  todo = todo.slice(0, PER_RUN);

  const results = [];
  for (const row of todo) {
    let reasons = [];
    try { reasons = (await moderationVerdict(row, row.id)).reasons; } catch (e) { reasons = ["ai_error"]; }
    const ai = await reviewListingText(row);
    const allReasons = [...reasons, ...ai.flags.map((f) => "ИИ: " + aiFlagsText([f]))];
    const clean = allReasons.length === 0;
    let decision = clean ? (mode === "on" ? "publish" : "would_publish") : "disputed";
    if (decision === "publish") {
      // Публикуем только если объявление всё ещё pending (его мог успеть разобрать человек).
      const { data: upd, error: ue } = await supa.from("listings").update({ status: "approved" })
        .eq("id", row.id).eq("status", "pending").select("id");
      if (ue || !upd || !upd.length) decision = "skipped";
      else { try { await publishApproved(row.id); } catch (e) { console.error("auto-mod publish:", e?.message); } }
    }
    if (hasLog) {
      await supa.from("auto_mod_log").insert({ listing_id: row.id, mode, decision, reasons: allReasons, ai: { ok: ai.ok, flags: ai.flags, note: ai.note } })
        .then(({ error: le }) => le && console.error("auto_mod_log:", le.message));
    }
    console.log("auto-mod", mode, row.id, decision, JSON.stringify(allReasons));
    results.push({ id: row.id, title: row.building_name, price: row.price, decision, reasons: allReasons, note: ai.note });
  }

  if (ADMIN && TOKEN && results.length) {
    const pub = results.filter((r) => r.decision === "publish" || r.decision === "would_publish");
    const disp = results.filter((r) => r.decision === "disputed");
    const line = (r) => `• #${r.id} ${esc(r.title)} · ${esc(r.price)}`; // pending не публичны — разбор в /admin
    const text =
      `🤖 <b>Автомодерация</b> · режим: <b>${mode === "on" ? "ВКЛ" : "тень (статусы не меняются)"}</b>\n` +
      `Проверено: ${results.length} · ${mode === "on" ? "опубликовано" : "опубликовал бы"}: ${pub.length} · спорных: ${disp.length}\n` +
      (pub.length ? `\n✅ ${mode === "on" ? "Опубликованы" : "Чистые"}:\n${pub.slice(0, 20).map(line).join("\n")}\n` : "") +
      (disp.length ? `\n⚠️ Спорные (ждут человека):\n${disp.slice(0, 20).map((r) => `${line(r)} — ${esc(reasonsText(r.reasons))}`).join("\n")}\n` : "") +
      (hasLog ? "" : `\nℹ️ Нет таблицы auto_mod_log (sql/036) — проверяются только свежие.`) +
      `\n🔗 <a href="${SITE}/admin">Админка</a>`;
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: ADMIN, text: text.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: true }),
    }).catch(() => {});
  }
  return Response.json({ ok: true, mode, hasLog, checked: results.length, results: results.map(({ id, decision, reasons }) => ({ id, decision, reasons })) });
}

export async function GET(req) { return run(req); }
export async function POST(req) { return run(req); }
