// T-20261118-08 п.2: полный перенос фото объявлений в R2 пачками (Vercel Cron каждые 5 мин, vercel.json).
// Порядок: сначала одобренные (видны на сайте), потом все остальные статусы.
// Ошибки: объявление с ошибкой не трогается, пишется строка status='error' (listing_id, текст в old_photos) —
// такие больше не берутся (битые/пропавшие файлы не стопорят весь перенос), попадают в итог.
// СТОП при массовых ошибках: 3+ ошибки в одном запуске → строка status='halt' (listing_id='__halt__'),
// дальше cron ничего не делает, в чат модерации одно сообщение.
// Снять стоп: update photo_migration set status='halt_cleared' where status='halt'.
// По завершении (переносить нечего) — строка status='complete' и одно сообщение с итогом.
// T-20261118-09: временные сбои R2/сети (5xx/429/обрыв) повторяются внутри r2Put/download; если всё равно
// не прошло — объявление НЕ помечается error (возьмётся в следующий запуск), запуск просто заканчивается.
// Стоп (halt) — только при 3+ НЕвременных ошибках за запуск. После listings — фаза extra (риелторы, ЖК и т.д.).
// Выключатель: R2_MIGRATE_CRON=off. Оригиналы в Supabase не удаляются. Журнал и откат — /api/admin/r2-migrate.
import { cookies } from "next/headers";
import { supa } from "@/lib/supabase";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { r2Enabled } from "@/lib/photoStore";
import { revalidateListings } from "@/lib/cache";
import { tableReady, migrateBatch, migrateExtraBatch } from "@/lib/r2Migrate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const BUDGET_MS = 200000; // запас до 300 с: последнее объявление должно успеть доехать
const PER_RUN_PHOTOS = 1500;
const HALT_ERRORS = 3;

async function errorIds() {
  const { data } = await supa.from("photo_migration").select("listing_id").eq("status", "error").limit(5000);
  return new Set((data || []).map((r) => String(r.listing_id)));
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.get("authorization") || "") === `Bearer ${secret}`) return true;
  return isSuperAdmin(verifySession(cookies().get("bx_session")?.value));
}

async function notify(text) {
  if (!TOKEN || !ADMIN) return;
  try {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: ADMIN, text, disable_web_page_preview: true }) });
  } catch (e) { console.error("r2-migrate notify:", e?.message); }
}

async function marker(status) {
  const { data } = await supa.from("photo_migration").select("id, old_photos, created_at").eq("status", status).order("id", { ascending: false }).limit(1);
  return data && data[0];
}

async function totals() {
  let from = 0, n = 0, photos = 0, bo = 0, bn = 0;
  for (;;) {
    const { data } = await supa.from("photo_migration").select("photos_count, bytes_old, bytes_new").eq("status", "done").range(from, from + 999);
    if (!data || !data.length) break;
    for (const r of data) { n++; photos += r.photos_count || 0; bo += Number(r.bytes_old || 0); bn += Number(r.bytes_new || 0); }
    if (data.length < 1000) break;
    from += 1000;
  }
  return { listings: n, photos, mbOld: Math.round(bo / 1048576), mbNew: Math.round(bn / 1048576) };
}

export async function GET(req) {
  if (!authorized(req)) return new Response("forbidden", { status: 403 });
  if ((process.env.R2_MIGRATE_CRON || "on").toLowerCase() === "off") return Response.json({ ok: true, skipped: "off" });
  if (!supa || !r2Enabled()) return Response.json({ ok: false, skipped: "not_configured" });
  if (!(await tableReady())) return Response.json({ ok: false, skipped: "no_table" });
  if (await marker("halt")) return Response.json({ ok: true, skipped: "halted" });
  if (await marker("complete")) return Response.json({ ok: true, skipped: "complete" });

  const t0 = Date.now();
  const exclude = await errorIds();
  let j = await migrateBatch({ limit: PER_RUN_PHOTOS, all: false, budgetMs: BUDGET_MS, par: 6, stopOnError: HALT_ERRORS, exclude });
  let phase = "approved";
  if (!j.picked) { // одобренные закончились — остальные статусы
    phase = "all";
    j = await migrateBatch({ limit: PER_RUN_PHOTOS, all: true, budgetMs: BUDGET_MS - (Date.now() - t0), par: 6, stopOnError: HALT_ERRORS, exclude });
  }
  if (!j.picked) { // объявления закончились — прочие таблицы (риелторы, ЖК, планировки, новости…)
    phase = "extra";
    const x = await migrateExtraBatch({ budgetMs: BUDGET_MS - (Date.now() - t0), exclude });
    j = { moved: x.moved, listings: x.rows, errors: x.errors, picked: x.rows + x.errors + x.left, ms: x.ms, report: x.report };
  }
  if (j.moved) revalidateListings();

  const all = j.report.filter((x) => x.error);
  const hard = all.filter((x) => !x.transient);
  for (const e of hard.slice(0, 10)) await supa.from("photo_migration").insert({ listing_id: String(e.id), old_photos: [e.error], new_photos: [], status: "error", photos_count: 0 });
  if (hard.length >= HALT_ERRORS) {
    const errs = hard.slice(0, 10);
    await supa.from("photo_migration").insert({ listing_id: "__halt__", old_photos: errs, new_photos: [], status: "halt", photos_count: 0 });
    const t = await totals();
    await notify(`⚠️ Перенос фото в R2 ОСТАНОВЛЕН: ${hard.length} ошибок за запуск (объявления с ошибкой не тронуты).\n${errs.map((e) => `${e.id}: ${e.error}`).join("\n")}\n\nПеренесено всего: ${t.listings} объявл., ${t.photos} фото, ${t.mbOld} → ${t.mbNew} МБ.\nПродолжить: суперадмин POST /api/admin/r2-migrate?clearHalt=1`);
  } else if (!j.picked && phase === "extra") {
    await supa.from("photo_migration").insert({ listing_id: "__complete__", old_photos: [], new_photos: [], status: "complete", photos_count: 0 });
    const t = await totals();
    const ex = await errorIds();
    await notify(`✅ Перенос фото в R2 завершён: ${t.listings} объявл., ${t.photos} фото, ${t.mbOld} → ${t.mbNew} МБ (+ риелторы/ЖК/прочее). Не перенесены из-за ошибок: ${ex.size} (photo_migration status='error'). Оригиналы в Supabase не удалены.`);
  }
  const { report, ...rest } = j;
  return Response.json({ ok: true, phase, ...rest, errorsList: report.filter((x) => x.error) });
}
