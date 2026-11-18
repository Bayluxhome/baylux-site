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
import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { r2Enabled, r2Put, toWebp } from "@/lib/photoStore";
import { revalidateListings } from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PHOTOS = 120; // T-08: фото одного объявления качаются/жмутся параллельно (до 5), поэтому за ~45 с успевает больше
const PAR = 5;
const isSupaPhoto = (u) => typeof u === "string" && u.includes("/storage/v1/object/public/listing-photos/") && !/\.(ogg|mp3|wav|bin)(\?|$)/i.test(u);

async function auth() {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  return null;
}

async function tableReady() {
  const { error } = await supa.from("photo_migration").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

// Кандидаты: одобренные объявления, свежие первыми, у которых есть фото в Supabase Storage.
// T-08: all=1 — все статусы (не только approved), чтобы перед удалением оригиналов ссылок на Supabase не осталось.
// Просматриваются все страницы (до 100×200), а не первые 10: иначе перенос «застревал» после 2000 объявлений.
async function pickListings(limit, all = false) {
  const out = [];
  let photos = 0;
  for (let page = 0; page < 100 && photos < limit; page++) {
    let q = supa.from("listings").select("id, photos, facade_photo, building_name");
    if (!all) q = q.eq("status", "approved");
    const { data, error } = await q.order("created_at", { ascending: false }).order("id", { ascending: false })
      .range(page * 200, page * 200 + 199);
    if (error) throw new Error("listings: " + error.message);
    if (!data || !data.length) break;
    for (const r of data) {
      const ph = Array.isArray(r.photos) ? r.photos : [];
      const n = ph.filter(isSupaPhoto).length + (isSupaPhoto(r.facade_photo) && !ph.includes(r.facade_photo) ? 1 : 0);
      if (!n) continue;
      if (out.length && photos + n > limit) continue; // целыми объявлениями, не выходя за limit
      out.push({ ...r, n });
      photos += n;
      if (photos >= limit) break;
    }
  }
  return { list: out, photos };
}

async function moveOne(url, listingId, i, cache) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`download ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const { full, thumb } = await toWebp(buf);
  const stem = `m/${String(listingId).replace(/[^A-Za-z0-9_-]/g, "")}/${i}-${Date.now().toString(36)}`;
  const newUrl = await r2Put(`${stem}.webp`, full, "image/webp");
  if (thumb) { try { await r2Put(`${stem}_400.webp`, thumb, "image/webp"); } catch (e) { console.error("r2 thumb:", e?.message); } }
  const res = { url: newUrl, bytesOld: buf.length, bytesNew: full.length };
  cache.set(url, res);
  return res;
}

export async function GET(req) {
  const denied = await auth(); if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const all = sp.get("all") === "1";
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
  const t0 = Date.now();
  const { list } = await pickListings(limit, sp.get("all") === "1");
  const report = [];
  let bytesOld = 0, bytesNew = 0, moved = 0;
  for (const r of list) {
    if (Date.now() - t0 > 45000) { report.push({ id: r.id, skipped: "time" }); continue; }
    const cache = new Map();
    try {
      const oldPhotos = Array.isArray(r.photos) ? r.photos : [];
      const newPhotos = oldPhotos.slice();
      let bo = 0, bn = 0;
      // Дубли одной ссылки внутри объявления переносим один раз (cache), остальные — параллельно по PAR.
      const idx = [], seen = new Set();
      oldPhotos.forEach((u, i) => { if (isSupaPhoto(u) && !seen.has(u)) { seen.add(u); idx.push(i); } });
      for (let k = 0; k < idx.length; k += PAR) {
        await Promise.all(idx.slice(k, k + PAR).map((i) => moveOne(oldPhotos[i], r.id, i, cache)));
      }
      for (let i = 0; i < oldPhotos.length; i++) {
        const u = oldPhotos[i];
        if (!isSupaPhoto(u)) continue;
        const m = cache.get(u);
        newPhotos[i] = m.url;
        if (idx.includes(i)) { bo += m.bytesOld; bn += m.bytesNew; }
      }
      let newFacade = r.facade_photo || null;
      if (isSupaPhoto(r.facade_photo)) {
        const m = await moveOne(r.facade_photo, r.id, "f", cache);
        newFacade = m.url; if (!oldPhotos.includes(r.facade_photo)) { bo += m.bytesOld; bn += m.bytesNew; }
      }
      // Сначала журнал (для отката), потом объявление.
      const { data: log, error: e1 } = await supa.from("photo_migration").insert({
        listing_id: String(r.id), old_photos: oldPhotos, new_photos: newPhotos,
        old_facade: r.facade_photo || null, new_facade: newFacade, photos_count: cache.size, bytes_old: bo, bytes_new: bn,
      }).select("id").single();
      if (e1 || !log) throw new Error("log: " + (e1?.message || "insert failed"));
      const { error: e2 } = await supa.from("listings").update({ photos: newPhotos, facade_photo: newFacade }).eq("id", r.id);
      if (e2) {
        await supa.from("photo_migration").update({ status: "failed" }).eq("id", log.id);
        throw new Error("update: " + e2.message);
      }
      moved += cache.size; bytesOld += bo; bytesNew += bn;
      report.push({ id: r.id, migration: log.id, photos: cache.size, kbOld: Math.round(bo / 1024), kbNew: Math.round(bn / 1024), first: newPhotos.find((u) => !isSupaPhoto(u)) || null });
    } catch (e) {
      report.push({ id: r.id, error: String(e?.message || e).slice(0, 200) }); // объявление не тронуто
    }
  }
  if (moved) revalidateListings();
  return Response.json({ ok: true, moved, listings: report.filter((x) => x.migration).length, kbOld: Math.round(bytesOld / 1024), kbNew: Math.round(bytesNew / 1024), ms: Date.now() - t0, report });
}
