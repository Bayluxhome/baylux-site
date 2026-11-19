// Перенос старых фото объявлений из Supabase Storage в Cloudflare R2 (T-20261118-05, п.4).
// Только суперадмин (вход на сайте, cookie bx_session). Ключи R2 — только в переменных Vercel.
//
// GET  /api/admin/r2-migrate?limit=20           → сухой прогон: что будет перенесено, НИЧЕГО не пишет
// POST /api/admin/r2-migrate?live=1&limit=20    → перенос: до limit фото (целыми объявлениями, не больше 50)
// POST /api/admin/r2-migrate?rollback=<id|all>  → откат: вернуть старые ссылки (по журналу photo_migration)
//
// Как переносится одно объявление: каждое фото из bucket listing-photos скачивается, пережимается
// (toWebp: WebP 1280 px под PHOTO_TARGET_KB + превью _400.webp) и кладётся в R2 под ключом m/<id>/...;
// если хоть одно фото не удалось — объявление НЕ меняется. Затем строка в photo_migration
// (старые и новые ссылки), и только после неё обновляется listings.photos (и facade_photo).
// photo_hashes не трогаем: они по оригиналу, дедуп и сверка с парсером работают как раньше.
// Оригиналы в Supabase не удаляются.
//
// T-20261118-09:
// GET  ?status=1                 → журнал: счёт по status, стоп/ошибки/бэкап (последние)
// GET  ?scan=1[&tables=a,b]      → счёт ссылок на supabase.co/storage по таблицам и колонкам (проверка «= 0»)
// POST ?clearHalt=1              → снять стоп cron (halt → halt_cleared)
// POST ?retryErrors=1[&id=<listing_id>] → ошибочные снова в работу (error → error_retried)
// POST ?rollback=extra:<id|all>  → откат прочих таблиц (риелторы/ЖК…) по журналу status='done_extra'
//
// T-20261119-11 (удаление оригиналов из Supabase Storage, bucket listing-photos; условия — lib/r2Purge.js):
// GET  ?purge=1&dry=1            → только посчитать, что будет удалено (ничего не пишет)
// POST ?purge=1[&max=N]          → удаление пачками по бюджету времени (~180 с), курсор в photo_migration '__purge__';
//                                   повторять, пока done:true. max — не больше N файлов за вызов (первая пачка).
import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { r2Enabled } from "@/lib/photoStore";
import { revalidateListings } from "@/lib/cache";
import { pickListings, tableReady, migrateBatch, scanSupaLinks } from "@/lib/r2Migrate";
import { purgePlan, purgeBatch } from "@/lib/r2Purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_PHOTOS = 120;

async function auth() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  return null;
}

export async function GET(req) {
  const denied = await auth(); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const all = sp.get("all") === "1";
  if (sp.get("status") === "1") {
    const by = {};
    for (let from = 0; ; from += 1000) {
      const { data } = await supa.from("photo_migration").select("status").range(from, from + 999);
      if (!data || !data.length) break;
      data.forEach((r) => { by[r.status] = (by[r.status] || 0) + 1; });
      if (data.length < 1000) break;
    }
    const pick = async (st, n = 50) => (await supa.from("photo_migration").select("id, listing_id, old_photos, created_at, status").eq("status", st).order("id", { ascending: false }).limit(n)).data || [];
    return Response.json({ ok: true, byStatus: by, halt: await pick("halt", 5), errors: await pick("error", 100), backup: (await supa.from("photo_migration").select("id, status, photos_count, bytes_old, old_photos").eq("listing_id", "__backup__").order("id", { ascending: false }).limit(1)).data });
  }
  if (sp.get("purge") === "1") {
    if (sp.get("dry") !== "1") return Response.json({ ok: false, error: "need_dry_or_post", hint: "GET ?purge=1&dry=1 — подсчёт; POST ?purge=1 — удаление" }, { status: 400 });
    const p = await purgePlan();
    if (p.ok) { delete p.del; delete p.pre; }
    return Response.json({ dryRun: true, ...p }, { status: p.ok ? 200 : 409 });
  }
  if (sp.get("scan") === "1") {
    const t = sp.get("tables"); 
    return Response.json({ ok: true, scan: await scanSupaLinks(t ? t.split(",") : undefined) });
  }
  // ?count=1 — сколько ВСЕГО осталось перенести (объявлений/фото), без записи
  if (sp.get("count") === "1") {
    const { list, photos } = await pickListings(1e9, all);
    return Response.json({ ok: true, dryRun: true, all, remaining: { listings: list.length, photos } });
  }
  const limit = Math.min(MAX_PHOTOS, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));
  const { list, photos } = await pickListings(limit, all);
  const { count: migrated } = await supa.from("photo_migration").select("id", { head: true, count: "exact" }).eq("status", "done").then((x) => x, () => ({ count: null }));
  return Response.json({
    ok: true, dryRun: true, r2: r2Enabled(), table: await tableReady(), migratedListings: migrated ?? null,
    willMove: { listings: list.length, photos }, sample: list.map((r) => ({ id: r.id, name: r.building_name, photos: r.n })),
  });
}

export async function POST(req) {
  const denied = await auth(); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  if (!(await tableReady())) return Response.json({ ok: false, error: "no_table", hint: "Выполнить sql/036_photo_migration.sql" }, { status: 409 });

  if (sp.get("purge") === "1") {
    const max = Math.max(1, parseInt(sp.get("max") || "100000", 10) || 100000);
    const r = await purgeBatch({ budgetMs: 180000, max });
    return Response.json(r, { status: r.ok ? 200 : 409 });
  }
  if (sp.get("clearHalt") === "1") {
    const { data, error } = await supa.from("photo_migration").update({ status: "halt_cleared" }).eq("status", "halt").select("id");
    return Response.json({ ok: !error, cleared: (data || []).length, error: error?.message });
  }
  if (sp.get("retryErrors") === "1") {
    let q = supa.from("photo_migration").update({ status: "error_retried" }).eq("status", "error");
    if (sp.get("id")) q = q.eq("listing_id", sp.get("id"));
    const { data, error } = await q.select("listing_id");
    return Response.json({ ok: !error, retried: (data || []).map((r) => r.listing_id), error: error?.message });
  }

  // ── откат прочих таблиц ──
  const rbx = sp.get("rollback") || "";
  if (rbx.startsWith("extra:")) {
    const which = rbx.slice(6);
    let q = supa.from("photo_migration").select("*").eq("status", "done_extra");
    if (which !== "all") q = q.eq("id", which);
    const { data: rows, error } = await q.order("id", { ascending: false }).limit(1000);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    const done = [], skipped = [];
    for (const m of rows || []) {
      const [t, ...rest] = m.listing_id.split(":"); const id = rest.join(":");
      const cols = Object.keys(m.new_photos || {});
      const { data: cur } = await supa.from(t).select(cols.join(",")).eq("id", id).maybeSingle();
      if (!cur || cols.some((k) => JSON.stringify(cur[k]) !== JSON.stringify(m.new_photos[k]))) { skipped.push(m.listing_id); continue; }
      const { error: e2 } = await supa.from(t).update(m.old_photos).eq("id", id);
      if (e2) { skipped.push(m.listing_id); continue; }
      await supa.from("photo_migration").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", m.id);
      done.push(m.listing_id);
    }
    return Response.json({ ok: true, rolledBack: done, skipped });
  }

  // ── откат ──
  const rb = sp.get("rollback");
  if (rb) {
    let q = supa.from("photo_migration").select("*").eq("status", "done");
    if (rb !== "all") q = q.eq("id", rb);
    const { data: rows, error } = await q.order("id", { ascending: false }).limit(500);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    const done = [], skipped = [];
    for (const m of rows || []) {
      const { data: cur } = await supa.from("listings").select("photos, facade_photo").eq("id", m.listing_id).maybeSingle();
      // Возвращаем, только если ссылки не меняли после переноса (иначе затрём правку владельца).
      if (!cur || JSON.stringify(cur.photos || []) !== JSON.stringify(m.new_photos || [])) { skipped.push(m.listing_id); continue; }
      const upd = { photos: m.old_photos };
      if (m.new_facade && cur.facade_photo === m.new_facade) upd.facade_photo = m.old_facade;
      const { error: e2 } = await supa.from("listings").update(upd).eq("id", m.listing_id);
      if (e2) { skipped.push(m.listing_id); continue; }
      await supa.from("photo_migration").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() }).eq("id", m.id);
      done.push(m.listing_id);
    }
    if (done.length) revalidateListings();
    return Response.json({ ok: true, rolledBack: done, skipped });
  }

  // ── перенос ──
  if (sp.get("live") !== "1") return Response.json({ ok: false, error: "need_live", hint: "POST ?live=1&limit=20" }, { status: 400 });
  if (!r2Enabled()) return Response.json({ ok: false, error: "r2_not_configured", hint: "R2_* в Vercel + Redeploy" }, { status: 409 });
  const limit = Math.min(MAX_PHOTOS, Math.max(1, parseInt(sp.get("limit") || "20", 10) || 20));
  const j = await migrateBatch({ limit, all: sp.get("all") === "1", budgetMs: 45000, par: 5 });
  if (j.moved) revalidateListings();
  return Response.json({ ok: true, ...j });
}
