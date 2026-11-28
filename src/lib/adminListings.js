// Данные для админки объявлений (06.11.2026). Раньше страница тянула все ~3800 объявлений
// со всеми полями и отдавала их в браузер (2–9 МБ, ~9 с). Теперь: лёгкая выборка всех строк
// только на сервере (счётчики, источники, дубли), а в браузер — одна страница (100 шт.).
import { supa, fetchAll } from "@/lib/supabase";
import { slugify } from "@/data/sheet";

const LIGHT = "id,status,created_at,building_name,area,rooms,price,photo_hashes,batch_id,source_url,owner_email,tg_user_id,seller_type";
const FULL = "id,deal,type,building_name,price,area,rooms,status,owner_email,tg_user_id,photos,owner_name,owner_phone,owner_tg_username,source_ref,source_url,batch_id,created_at,seller_type";
const TZ = "Asia/Tbilisi";
export const dayKey = (iso) => { if (!iso) return ""; try { return new Date(iso).toLocaleDateString("ru-RU", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }); } catch { return ""; } };

export function sourceOf(r) {
  const baylux = r.owner_email && /^bayluxhome@/i.test(r.owner_email);
  if (r.batch_id || r.source_url) return r.owner_email && !baylux ? "partner" : "parser";
  // 11.11 Дмитрий: «сам выложил» делим на собственника и агента (по seller_type; не указан = собственник).
  if (baylux) return "team";
  return r.seller_type === "agent" ? "self_agent" : "self_owner";
}

// ── Кэш лёгкой выборки (28.11.2026, T-20261128-02) ─────────────────────────────────────────
// Замер 28.11: /admin и каждый клик фильтра / «Показать ещё» — 4,2–4,8 с. Причина: на КАЖДЫЙ
// запрос заново читались все ~4500 объявлений (5 запросов по 1000 строк подряд) и заново
// строились карты дублей. Теперь: страницы читаются параллельно, результат и карты дублей
// живут в памяти инстанса 60 с; модерация/правка/удаление сбрасывают кэш (lib/cache.js).
const TTL = 60e3;
let cache = null;      // { at, light, hashOwners, fbOwners, counts, srcCount }
let loading = null;    // общий промис — параллельные запросы не читают базу дважды

export function invalidateAdminListings() { cache = null; }

const fbKey = (r) => {
  const bn = String(r.building_name || "").toLowerCase().trim();
  if (!bn || !(r.area > 0)) return null;
  return [bn, r.area, r.rooms || 0, String(r.price || "")].join("|");
};

async function readLight() {
  const PAGE = 1000;
  const q = (p) => supa.from("listings").select(LIGHT, p === 0 ? { count: "exact" } : undefined)
    .order("created_at", { ascending: false }).order("id", { ascending: true }).range(p * PAGE, p * PAGE + PAGE - 1);
  const first = await q(0);
  if (first.error) return fetchAll("listings", LIGHT, (x) => x.order("created_at", { ascending: false }));
  const pages = Math.min(20, Math.ceil((first.count || 0) / PAGE));
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => q(i + 1)));
  if (rest.some((r) => r.error)) return fetchAll("listings", LIGHT, (x) => x.order("created_at", { ascending: false }));
  return [...(first.data || []), ...rest.flatMap((r) => r.data || [])];
}

async function lightData() {
  if (cache && Date.now() - cache.at < TTL) return cache;
  if (loading) return loading;
  loading = (async () => {
    const light = await readLight();
    const hashOwners = new Map(), fbOwners = new Map(), counts = {}, srcCount = {};
    light.forEach((r) => {
      (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => {
        if (!h) return; if (!hashOwners.has(h)) hashOwners.set(h, []); hashOwners.get(h).push(r.id);
      });
      const k = fbKey(r); if (k) { if (!fbOwners.has(k)) fbOwners.set(k, []); fbOwners.get(k).push(r.id); }
      r._src = sourceOf(r); counts[r.status] = (counts[r.status] || 0) + 1; srcCount[r._src] = (srcCount[r._src] || 0) + 1;
    });
    const res = { at: Date.now(), light, hashOwners, fbOwners, counts, srcCount };
    if (light.length) cache = res; // пустой ответ (сбой базы) не кэшируем
    return res;
  })();
  try { return await loading; } finally { loading = null; }
}

// Число объявлений на владельца (e-mail / Telegram-id) — для «Люди» (пользователи, риелторы).
// Раньше каждая из этих страниц отдельно читала все объявления; теперь — из того же кэша.
export async function listingOwnerCounts() {
  const byEmail = {}, byTg = {};
  if (!supa) return { byEmail, byTg };
  const { light } = await lightData();
  light.forEach((l) => {
    if (l.owner_email) { const k = String(l.owner_email).toLowerCase(); byEmail[k] = (byEmail[k] || 0) + 1; }
    if (l.tg_user_id != null) { const k = String(l.tg_user_id); byTg[k] = (byTg[k] || 0) + 1; }
  });
  return { byEmail, byTg };
}

export async function loadAdminListings({ offset = 0, limit = 100, status = "all", source = "all", canSeeOwner = false } = {}) {
  if (!supa) return { items: [], total: 0, totalAll: 0, counts: {}, srcCount: {}, dayCounts: {} };
  const { light, hashOwners, fbOwners, counts, srcCount } = await lightData();
  // Дубли: совпадение фото-хэшей ИЛИ адрес+площадь+комнаты+цена (как было).
  const dupesOf = (r) => {
    const set = new Set();
    (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => (hashOwners.get(h) || []).forEach((id) => { if (id !== r.id) set.add(id); }));
    const k = fbKey(r); if (k) (fbOwners.get(k) || []).forEach((id) => { if (id !== r.id) set.add(id); });
    return [...set];
  };
  const filtered = light.filter((r) => (status === "all" || r.status === status) && (source === "all" || r._src === source));
  const dayCounts = {};
  filtered.forEach((r) => { const k = dayKey(r.created_at); dayCounts[k] = (dayCounts[k] || 0) + 1; });

  const pageRows = filtered.slice(offset, offset + limit);
  const ids = pageRows.map((r) => r.id);
  let full = [];
  if (ids.length) { const { data } = await supa.from("listings").select(FULL).in("id", ids); full = data || []; }
  const byId = new Map(full.map((r) => [r.id, r]));

  const items = pageRows.map((lr) => {
    const r = byId.get(lr.id) || lr;
    return {
      id: r.id,
      title: `${r.deal || ""} · ${r.type || ""}`,
      sub: `${r.building_name} · ${r.price}${r.area ? ` · ${r.area} м²` : ""}`,
      status: r.status,
      created: r.created_at || "",
      source: lr._src,
      channel: (String(r.source_url || "").match(/t\.me\/(?:s\/)?([A-Za-z0-9_]+)/) || [])[1] || "",
      owner: r.owner_email || (r.tg_user_id ? `tg:${r.tg_user_id}` : ""),
      photo: (Array.isArray(r.photos) && r.photos[0]) || "/placeholder-baylux.jpg",
      slug: r.status === "approved" ? slugify(`${r.building_name}-${r.type || ""}-${r.price || ""}`) : null,
      seller: r.seller_type || "", // owner / agent (06.11)
      dupes: dupesOf(lr),
      // Служебные контакты — только тем, у кого есть право модерации.
      ownerName: canSeeOwner ? (r.owner_name || "") : "",
      ownerPhone: canSeeOwner ? (r.owner_phone || "") : "",
      ownerTg: canSeeOwner ? (r.owner_tg_username || "") : "",
      sourceRef: canSeeOwner ? (r.source_ref || "") : "",
      sourceUrl: canSeeOwner ? (r.source_url || "") : "",
    };
  });
  return { items, total: filtered.length, totalAll: light.length, counts, srcCount, dayCounts };
}
