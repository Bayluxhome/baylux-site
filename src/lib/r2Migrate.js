// Ядро переноса фото объявлений Supabase Storage → Cloudflare R2 (T-20261118-05 п.4, T-20261118-08 п.2).
// Используют: /api/admin/r2-migrate (ручной вызов суперадмина) и /api/cron/r2-migrate (Vercel Cron, пачками).
// Объявление переносится целиком: каждое фото скачивается, пережимается (WebP 1280 под PHOTO_TARGET_KB + превью _400)
// и кладётся в R2 (m/<id>/…). Ошибка любого фото → объявление НЕ меняется. Сначала строка в photo_migration
// (старые и новые ссылки, для отката), только потом listings.photos/facade_photo. photo_hashes не трогаем.
// Оригиналы в Supabase НЕ удаляются.
import { supa } from "@/lib/supabase";
import { r2Put, toWebp } from "@/lib/photoStore";

export const isSupaPhoto = (u) => typeof u === "string" && u.includes("/storage/v1/object/public/listing-photos/") && !/\.(ogg|mp3|wav|bin)(\?|$)/i.test(u);

export async function tableReady() {
  const { error } = await supa.from("photo_migration").select("id", { head: true, count: "exact" }).limit(1);
  return !error;
}

// Кандидаты: объявления со ссылками на Supabase Storage, свежие первыми. all=false — только approved.
// Просматриваются все страницы (до 100×200).
export async function pickListings(limit, all = false, exclude = null) {
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
      if (!n || (exclude && exclude.has(String(r.id)))) continue;
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

async function migrateListing(r, par) {
  const cache = new Map();
  const oldPhotos = Array.isArray(r.photos) ? r.photos : [];
  const newPhotos = oldPhotos.slice();
  let bo = 0, bn = 0;
  const idx = [], seen = new Set();
  oldPhotos.forEach((u, i) => { if (isSupaPhoto(u) && !seen.has(u)) { seen.add(u); idx.push(i); } });
  for (let k = 0; k < idx.length; k += par) {
    await Promise.all(idx.slice(k, k + par).map((i) => moveOne(oldPhotos[i], r.id, i, cache)));
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
  return { id: r.id, migration: log.id, photos: cache.size, bo, bn, first: newPhotos.find((u) => !isSupaPhoto(u)) || null };
}

// Пачка: до limit фото, пока не вышло budgetMs. stopOnError — после первой ошибки дальше не идём.
export async function migrateBatch({ limit, all = false, budgetMs = 45000, par = 5, stopOnError = false, exclude = null }) {
  const t0 = Date.now();
  const { list } = await pickListings(limit, all, exclude);
  const report = [];
  let bytesOld = 0, bytesNew = 0, moved = 0, errors = 0;
  for (const r of list) {
    if (Date.now() - t0 > budgetMs || (stopOnError && errors >= stopOnError)) { report.push({ id: r.id, skipped: errors ? "error_stop" : "time" }); continue; }
    try {
      const x = await migrateListing(r, par);
      moved += x.photos; bytesOld += x.bo; bytesNew += x.bn;
      report.push({ id: x.id, migration: x.migration, photos: x.photos, kbOld: Math.round(x.bo / 1024), kbNew: Math.round(x.bn / 1024), first: x.first });
    } catch (e) {
      errors++;
      report.push({ id: r.id, error: String(e?.message || e).slice(0, 200) }); // объявление не тронуто
    }
  }
  return { moved, listings: report.filter((x) => x.migration).length, errors, picked: list.length, kbOld: Math.round(bytesOld / 1024), kbNew: Math.round(bytesNew / 1024), ms: Date.now() - t0, report };
}
