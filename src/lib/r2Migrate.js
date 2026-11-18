// Ядро переноса фото объявлений Supabase Storage → Cloudflare R2 (T-20261118-05 п.4, T-20261118-08 п.2).
// Используют: /api/admin/r2-migrate (ручной вызов суперадмина) и /api/cron/r2-migrate (Vercel Cron, пачками).
// Объявление переносится целиком: каждое фото скачивается, пережимается (WebP 1280 под PHOTO_TARGET_KB + превью _400)
// и кладётся в R2 (m/<id>/…). Ошибка любого фото → объявление НЕ меняется. Сначала строка в photo_migration
// (старые и новые ссылки, для отката), только потом listings.photos/facade_photo. photo_hashes не трогаем.
// Оригиналы в Supabase НЕ удаляются.
import { supa } from "@/lib/supabase";
import { r2Put, toWebp, isTransientErr } from "@/lib/photoStore";
export { isTransientErr };

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

// Скачать с повторами при временных сбоях (5xx/429/обрыв).
export async function download(url) {
  let last;
  for (let a = 0; a < 3; a++) {
    if (a) await new Promise((r) => setTimeout(r, 800 * a));
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`download ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    } catch (e) { last = e; if (!isTransientErr(e)) throw e; }
  }
  throw last;
}

async function moveOne(url, listingId, i, cache) {
  if (cache.has(url)) return cache.get(url);
  const buf = await download(url);
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
      report.push({ id: r.id, error: String(e?.message || e).slice(0, 200), transient: isTransientErr(e) }); // объявление не тронуто
    }
  }
  return { moved, listings: report.filter((x) => x.migration).length, errors, picked: list.length, kbOld: Math.round(bytesOld / 1024), kbNew: Math.round(bytesNew / 1024), ms: Date.now() - t0, report };
}


// ───────── п.2 T-20261118-09: фото вне listings (риелторы, ЖК, планировки, новости, отчёты) ─────────
// Любая строка/JSON-поле с публичной ссылкой Supabase Storage (любой bucket) → файл в R2 (x/<таблица>/<id>/…),
// картинки — WebP как у объявлений, прочее (pdf и т.п.) — как есть. Журнал: photo_migration
// listing_id='<таблица>:<id>', old_photos/new_photos = {колонка: значение}, status='done_extra'. Откат — admin ?rollback=extra:<id|all>.
export const SUPA_URL_RE = /https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s"'<>)\]\\]+/g;
export const EXTRA_TABLES = ["realtors", "complexes", "complex_units", "news", "collections", "photo_reports", "management_reports", "site_users", "users", "clients", "leads", "owner_messages"];
const IMG_RE = /\.(jpe?g|png|webp|gif|heic|heif|avif)(\?|$)/i;
const hasSupa = (v) => { SUPA_URL_RE.lastIndex = 0; return SUPA_URL_RE.test(typeof v === "string" ? v : JSON.stringify(v ?? null)); };

function urlsIn(v, out = new Set()) {
  if (typeof v === "string") { for (const m of v.matchAll(SUPA_URL_RE)) out.add(m[0]); }
  else if (Array.isArray(v)) v.forEach((x) => urlsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => urlsIn(x, out));
  return out;
}
function replaceIn(v, map) {
  if (typeof v === "string") return v.replace(SUPA_URL_RE, (u) => map.get(u) || u);
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, map));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replaceIn(x, map)]));
  return v;
}

async function tableRows(t, from, to) {
  const { data, error } = await supa.from(t).select("*").range(from, to);
  if (error) return { error: error.message };
  return { data: data || [] };
}

// Счёт ссылок на Supabase Storage по таблицам (для проверки «= 0»). tables — по умолчанию listings + EXTRA_TABLES.
export async function scanSupaLinks(tables = ["listings", ...EXTRA_TABLES]) {
  const res = {};
  for (const t of tables) {
    let rows = 0, links = 0; const cols = {}; let err = null;
    for (let p = 0; p < 200; p++) {
      const { data, error } = await tableRows(t, p * 1000, p * 1000 + 999);
      if (error) { err = error; break; }
      for (const r of data) {
        let any = false;
        for (const [k, v] of Object.entries(r)) { const n = urlsIn(v).size; if (n) { cols[k] = (cols[k] || 0) + n; links += n; any = true; } }
        if (any) rows++;
      }
      if (data.length < 1000) break;
    }
    res[t] = err ? { error: err } : { rows, links, cols };
  }
  return res;
}

async function moveAny(url, key) {
  const buf = await download(url);
  if (IMG_RE.test(url)) {
    try {
      const { full, thumb } = await toWebp(buf);
      const u = await r2Put(`${key}.webp`, full, "image/webp");
      if (thumb) { try { await r2Put(`${key}_400.webp`, thumb, "image/webp"); } catch (e) { /* превью не критично */ } }
      return { url: u, bo: buf.length, bn: full.length };
    } catch (e) { if (isTransientErr(e)) throw e; /* не картинка по факту — кладём как есть */ }
  }
  const ext = (url.split("?")[0].match(/\.([A-Za-z0-9]{1,6})$/) || [, "bin"])[1].toLowerCase();
  const ct = { pdf: "application/pdf", mp4: "video/mp4", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" }[ext] || "application/octet-stream";
  const u = await r2Put(`${key}.${ext}`, buf, ct);
  return { url: u, bo: buf.length, bn: buf.length };
}

// Одна пачка «прочих» таблиц. Возвращает { moved, rows, errors, report, left }.
export async function migrateExtraBatch({ budgetMs = 150000, exclude = new Set(), tables = EXTRA_TABLES } = {}) {
  const t0 = Date.now();
  const report = []; let moved = 0, errors = 0, left = 0;
  for (const t of tables) {
    for (let p = 0; p < 200; p++) {
      const { data, error } = await tableRows(t, p * 1000, p * 1000 + 999);
      if (error) break; // таблицы нет / нет доступа — пропуск
      for (const r of data) {
        if (r.id === undefined || r.id === null) continue;
        const cols = Object.keys(r).filter((k) => hasSupa(r[k]));
        if (!cols.length || exclude.has(`${t}:${r.id}`)) continue;
        if (Date.now() - t0 > budgetMs) { left++; continue; }
        try {
          const urls = new Set(); cols.forEach((k) => urlsIn(r[k], urls));
          const map = new Map(); let bo = 0, bn = 0, i = 0;
          for (const u of urls) {
            const key = `x/${t}/${String(r.id).replace(/[^A-Za-z0-9_-]/g, "")}/${i++}-${Date.now().toString(36)}`;
            const m = await moveAny(u, key); map.set(u, m.url); bo += m.bo; bn += m.bn;
          }
          const oldV = Object.fromEntries(cols.map((k) => [k, r[k]]));
          const newV = Object.fromEntries(cols.map((k) => [k, replaceIn(r[k], map)]));
          const { data: log, error: e1 } = await supa.from("photo_migration").insert({
            listing_id: `${t}:${r.id}`, old_photos: oldV, new_photos: newV, photos_count: map.size, bytes_old: bo, bytes_new: bn, status: "done_extra",
          }).select("id").single();
          if (e1 || !log) throw new Error("log: " + (e1?.message || "insert failed"));
          const { error: e2 } = await supa.from(t).update(newV).eq("id", r.id);
          if (e2) { await supa.from("photo_migration").update({ status: "failed" }).eq("id", log.id); throw new Error("update: " + e2.message); }
          moved += map.size;
          report.push({ id: `${t}:${r.id}`, migration: log.id, photos: map.size, kbOld: Math.round(bo / 1024), kbNew: Math.round(bn / 1024) });
        } catch (e) {
          errors++;
          report.push({ id: `${t}:${r.id}`, error: String(e?.message || e).slice(0, 200), transient: isTransientErr(e) });
        }
      }
      if (data.length < 1000) break;
    }
  }
  return { moved, rows: report.filter((x) => x.migration).length, errors, left, ms: Date.now() - t0, report };
}

// ───────── п.3: бэкап оригиналов Supabase Storage (все bucket'ы) в R2 backup/<дата>/<bucket>/<путь> ─────────
// Байты как есть. Состояние — строка photo_migration listing_id='__backup__', status='backup'|'backup_done',
// old_photos = {done: ["bucket/путь", ...последний по алфавиту в каждом bucket], files, bytes}.
export const BACKUP_PREFIX = "backup/2026-11-18";

async function listAll(bucket, prefix = "", out = []) {
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supa.storage.from(bucket).list(prefix, { limit: 1000, offset: off, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const o of data || []) {
      const path = prefix ? `${prefix}/${o.name}` : o.name;
      if (o.id === null || !o.metadata) await listAll(bucket, path, out); // папка
      else out.push({ path, size: o.metadata?.size || 0, ct: o.metadata?.mimetype || "application/octet-stream" });
    }
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function backupBatch({ budgetMs = 200000, par = 6 } = {}) {
  const t0 = Date.now();
  let { data: st } = await supa.from("photo_migration").select("id, old_photos, status").eq("listing_id", "__backup__").order("id", { ascending: false }).limit(1);
  st = st && st[0];
  if (st && st.status === "backup_done") return { done: true, state: st.old_photos };
  const state = (st && st.old_photos && !Array.isArray(st.old_photos)) ? st.old_photos : { cursor: {}, files: 0, bytes: 0, errors: [], buckets: {} };
  if (!st) {
    const { data: ins } = await supa.from("photo_migration").insert({ listing_id: "__backup__", old_photos: state, new_photos: [], status: "backup", photos_count: 0 }).select("id").single();
    st = { id: ins.id };
  }
  const { data: buckets, error: be } = await supa.storage.listBuckets();
  if (be) throw new Error("buckets: " + be.message);
  let finished = true, did = 0;
  for (const b of buckets || []) {
    const files = (await listAll(b.name)).sort((x, y) => (x.path < y.path ? -1 : 1));
    state.buckets[b.name] = { files: files.length, bytes: files.reduce((a, f) => a + (f.size || 0), 0) };
    const cur = state.cursor[b.name] || "";
    const todo = files.filter((f) => f.path > cur);
    for (let k = 0; k < todo.length; k += par) {
      if (Date.now() - t0 > budgetMs) { finished = false; break; }
      const chunk = todo.slice(k, k + par);
      const res = await Promise.all(chunk.map(async (f) => {
        try {
          const { data, error } = await supa.storage.from(b.name).download(f.path);
          if (error) throw new Error("download: " + error.message);
          const buf = Buffer.from(await data.arrayBuffer());
          await r2Put(`${BACKUP_PREFIX}/${b.name}/${f.path}`, buf, f.ct);
          return { ok: true, bytes: buf.length };
        } catch (e) { return { ok: false, path: `${b.name}/${f.path}`, err: String(e?.message || e).slice(0, 120) }; }
      }));
      for (const r of res) { if (r.ok) { state.files++; state.bytes += r.bytes; did++; } else if (state.errors.length < 200) state.errors.push(r); }
      state.cursor[b.name] = chunk[chunk.length - 1].path;
    }
    if (!finished) break;
  }
  await supa.from("photo_migration").update({ old_photos: state, photos_count: state.files, bytes_old: state.bytes, status: finished ? "backup_done" : "backup" }).eq("id", st.id);
  return { done: finished, did, ms: Date.now() - t0, state };
}
