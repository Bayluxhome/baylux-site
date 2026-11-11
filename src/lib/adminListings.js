// Данные для админки объявлений (06.11.2026). Раньше страница тянула все ~3800 объявлений
// со всеми полями и отдавала их в браузер (2–9 МБ, ~9 с). Теперь: лёгкая выборка всех строк
// только на сервере (счётчики, источники, дубли), а в браузер — одна страница (100 шт.).
import { supa, fetchAll } from "@/lib/supabase";
import { slugify } from "@/data/sheet";

const LIGHT = "id,status,created_at,building_name,area,rooms,price,photo_hashes,batch_id,source_url,owner_email,seller_type";
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

export async function loadAdminListings({ offset = 0, limit = 100, status = "all", source = "all", canSeeOwner = false } = {}) {
  if (!supa) return { items: [], total: 0, totalAll: 0, counts: {}, srcCount: {}, dayCounts: {} };
  const light = await fetchAll("listings", LIGHT, (q) => q.order("created_at", { ascending: false }));

  // Дубли: совпадение фото-хэшей ИЛИ адрес+площадь+комнаты+цена (как было).
  const hashOwners = new Map();
  const fbOwners = new Map();
  const fbKey = (r) => {
    const bn = String(r.building_name || "").toLowerCase().trim();
    if (!bn || !(r.area > 0)) return null;
    return [bn, r.area, r.rooms || 0, String(r.price || "")].join("|");
  };
  light.forEach((r) => {
    (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => {
      if (!h) return; if (!hashOwners.has(h)) hashOwners.set(h, []); hashOwners.get(h).push(r.id);
    });
    const k = fbKey(r); if (k) { if (!fbOwners.has(k)) fbOwners.set(k, []); fbOwners.get(k).push(r.id); }
  });
  const dupesOf = (r) => {
    const set = new Set();
    (Array.isArray(r.photo_hashes) ? r.photo_hashes : []).forEach((h) => (hashOwners.get(h) || []).forEach((id) => { if (id !== r.id) set.add(id); }));
    const k = fbKey(r); if (k) (fbOwners.get(k) || []).forEach((id) => { if (id !== r.id) set.add(id); });
    return [...set];
  };

  const counts = {};
  const srcCount = {};
  light.forEach((r) => { r._src = sourceOf(r); counts[r.status] = (counts[r.status] || 0) + 1; srcCount[r._src] = (srcCount[r._src] || 0) + 1; });
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
