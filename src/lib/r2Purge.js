// T-20261119-11: удаление оригиналов фото из Supabase Storage (bucket listing-photos) после переноса в R2.
// Решение Дмитрия 19.11 14:13. Файл удаляется ТОЛЬКО если одновременно:
//   а) путь не начинается с agent-audio/ (живые временные голосовые);
//   б) копия есть в R2 backup/2026-11-18/listing-photos/<путь> и размер совпадает (список R2 + HEAD перед удалением);
//   в) публичный URL файла не встречается в БД. Если в основных таблицах (как в ?scan=1) есть хоть одна ссылка
//      на listing-photos (кроме agent-audio) — НЕ начинаем вообще («нужен Дмитрий»).
//   Файлы с ошибкой бэкапа (state.errors в '__backup__') не удаляются никогда.
// Другие bucket'ы, таблицы БД, сами bucket'ы — не трогаем. Состояние — photo_migration listing_id='__purge__'
// (status purge → purge_done; old_photos: курсор, удалено файлов/байт, ошибки).
import { supa } from "@/lib/supabase";
import { r2Head, r2List, r2Enabled } from "@/lib/photoStore";
import { listAll, BACKUP_PREFIX, SUPA_URL_RE, EXTRA_TABLES } from "@/lib/r2Migrate";

const BUCKET = "listing-photos";
const GATE_TABLES = ["listings", ...EXTRA_TABLES];
// Дополнительно ищем ссылки здесь; найденные файлы просто не удаляем (не стоп).
const MORE_TABLES = ["team_cards", "team_replies", "listing_reports", "client_notes", "photo_hashes", "chat_subscriptions"];
const AUDIO = (p) => p.startsWith("agent-audio/");

function pathsIn(v, out) {
  if (typeof v === "string") {
    for (const m of v.matchAll(SUPA_URL_RE)) {
      const i = m[0].indexOf(`/object/public/${BUCKET}/`);
      if (i < 0) continue;
      let p = m[0].slice(i + `/object/public/${BUCKET}/`.length).split("?")[0];
      try { p = decodeURIComponent(p); } catch {}
      out.add(p);
    }
  } else if (Array.isArray(v)) v.forEach((x) => pathsIn(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => pathsIn(x, out));
  return out;
}

async function refsIn(tables) {
  const paths = new Set(), byTable = {}, errors = {};
  for (const t of tables) {
    const mine = new Set();
    for (let p = 0; p < 200; p++) {
      const { data, error } = await supa.from(t).select("*").range(p * 1000, p * 1000 + 999);
      if (error) { errors[t] = error.message; break; }
      for (const r of data || []) pathsIn(r, mine);
      if (!data || data.length < 1000) break;
    }
    mine.forEach((x) => paths.add(x));
    if (mine.size) byTable[t] = mine.size;
  }
  return { paths, byTable, errors };
}

async function backupState() {
  const { data } = await supa.from("photo_migration").select("status, old_photos").eq("listing_id", "__backup__").order("id", { ascending: false }).limit(1);
  return data && data[0];
}

// План: что можно удалить (без записи).
export async function purgePlan() {
  if (!supa || !r2Enabled()) return { ok: false, error: "not_configured" };
  const bk = await backupState();
  if (!bk || bk.status !== "backup_done") return { ok: false, error: "backup_not_done", need: "нужен Дмитрий" };
  const gate = await refsIn(GATE_TABLES);
  const gateLive = [...gate.paths].filter((p) => !AUDIO(p));
  if (Object.keys(gate.errors).filter((t) => t === "listings").length) return { ok: false, error: "scan_failed", errors: gate.errors, need: "нужен Дмитрий" };
  if (gateLive.length) return { ok: false, error: "db_has_supabase_links", count: gateLive.length, byTable: gate.byTable, sample: gateLive.slice(0, 10), need: "нужен Дмитрий" };
  const more = await refsIn(MORE_TABLES);
  const keepDb = new Set([...gate.paths, ...more.paths]);
  const bkErr = new Set(((bk.old_photos && bk.old_photos.errors) || []).map((e) => String(e.path || "")).filter((p) => p.startsWith(BUCKET + "/")).map((p) => p.slice(BUCKET.length + 1)));
  const files = (await listAll(BUCKET)).sort((x, y) => (x.path < y.path ? -1 : 1));
  const pre = `${BACKUP_PREFIX}/${BUCKET}/`;
  const r2 = await r2List(pre);
  const c = { total: files.length, totalBytes: 0, audio: 0, backupError: 0, inDb: 0, noBackup: 0, sizeMismatch: 0, del: 0, delBytes: 0 };
  const del = [], kept = [];
  for (const f of files) {
    c.totalBytes += f.size || 0;
    let why = null;
    if (AUDIO(f.path)) why = "audio";
    else if (bkErr.has(f.path)) why = "backupError";
    else if (keepDb.has(f.path)) why = "inDb";
    else if (!r2.has(pre + f.path)) why = "noBackup";
    else if (r2.get(pre + f.path) !== f.size) why = "sizeMismatch";
    if (why) { c[why]++; if (why !== "audio" && kept.length < 30) kept.push({ path: f.path, why }); continue; }
    c.del++; c.delBytes += f.size || 0; del.push(f);
  }
  return { ok: true, counts: c, gb: { total: +(c.totalBytes / 2 ** 30).toFixed(2), del: +(c.delBytes / 2 ** 30).toFixed(2) }, r2Backup: r2.size, dbRefs: { gate: gate.byTable, more: more.byTable, moreErrors: more.errors }, keptSample: kept, del, pre };
}

// Удаление пачками по бюджету времени. max — не больше стольких файлов за вызов (первая пачка — для проверки сайта).
export async function purgeBatch({ budgetMs = 90000, max = 100000, par = 20 } = {}) {
  const t0 = Date.now();
  const plan = await purgePlan();
  if (!plan.ok) return plan;
  let { data: st } = await supa.from("photo_migration").select("id, old_photos, status").eq("listing_id", "__purge__").order("id", { ascending: false }).limit(1);
  st = st && st[0];
  const state = (st && st.old_photos && !Array.isArray(st.old_photos)) ? st.old_photos : { cursor: "", files: 0, bytes: 0, errors: [], startedAt: new Date().toISOString() };
  if (!st) {
    const { data: ins, error } = await supa.from("photo_migration").insert({ listing_id: "__purge__", old_photos: state, new_photos: [], status: "purge", photos_count: 0 }).select("id").single();
    if (error) return { ok: false, error: "state: " + error.message };
    st = { id: ins.id };
  }
  const todo = plan.del.filter((f) => f.path > (state.cursor || ""));
  let did = 0, finished = true;
  for (let k = 0; k < todo.length; k += par) {
    if (Date.now() - t0 > budgetMs || did >= max) { finished = false; break; }
    const chunk = todo.slice(k, Math.min(k + par, k + (max - did)));
    // Повторная проверка копии прямо перед удалением.
    const ok = (await Promise.all(chunk.map(async (f) => {
      try { const sz = await r2Head(plan.pre + f.path); return sz === f.size ? f : (state.errors.length < 200 && state.errors.push({ path: f.path, err: `head ${sz}≠${f.size}` }), null); }
      catch (e) { if (state.errors.length < 200) state.errors.push({ path: f.path, err: String(e?.message || e).slice(0, 100) }); return null; }
    }))).filter(Boolean);
    if (ok.length) {
      const { data, error } = await supa.storage.from(BUCKET).remove(ok.map((f) => f.path));
      if (error) { state.errors.push({ path: ok[0].path, err: "remove: " + error.message }); finished = false; break; }
      const gone = new Set((data || []).map((o) => o.name));
      for (const f of ok) if (gone.has(f.path)) { state.files++; state.bytes += f.size || 0; did++; }
    }
    state.cursor = chunk[chunk.length - 1].path;
  }
  state.lastRun = new Date().toISOString();
  const done = finished; // весь список пройден (непрошедшие проверку — остаются в Supabase)
  await supa.from("photo_migration").update({ old_photos: state, photos_count: state.files, bytes_old: state.bytes, status: done ? "purge_done" : "purge" }).eq("id", st.id);
  return { ok: true, done, did, ms: Date.now() - t0, deletedTotal: state.files, deletedGB: +(state.bytes / 2 ** 30).toFixed(2), errors: state.errors.length, lastErrors: state.errors.slice(-5), plannedLeft: Math.max(0, todo.length - did), counts: plan.counts };
}
