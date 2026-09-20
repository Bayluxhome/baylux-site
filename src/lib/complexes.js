// Новостройки (раздел /novostroyki): слой данных для публичных страниц и админки.
// Таблицы complexes / complex_units (sql/024_complexes.sql). Право на правку — can(session, "complexes").
import { cache } from "react";
import { supa, fetchAll } from "@/lib/supabase";
import { slugify } from "@/data/sheet";

export const COMPLEX_KINDS = ["apartments", "cottages", "mixed"];
export const COMPLEX_STATUSES = ["draft", "published", "hidden"];
export const SEA_NEAR_M = 500; // «у моря» — не дальше 500 м

// Служебные поля, которые не должны попадать в публичный HTML.
const PRIVATE = ["contract_note", "created_by"];

export function publicComplex(c) {
  if (!c) return null;
  const out = { ...c };
  for (const k of PRIVATE) delete out[k];
  return out;
}

// Производные признаки — используются и в фильтрах, и в тегах карточки.
export function complexTags(c) {
  return {
    sea: c.sea_distance_m != null && Number(c.sea_distance_m) <= SEA_NEAR_M,
    installment: Number(c.installment_months) > 0,
    completed: !!c.completed,
    building: !c.completed,
    investment: !!c.for_investment,
    renovated: !!c.renovated,
    premium: !!c.premium,
    eco: !!c.eco,
  };
}

export const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

// ---------- публичная выдача ----------

const loadPublished = cache(async () => {
  if (!supa) return [];
  const rows = await fetchAll("complexes", "*", (q) => q.eq("status", "published").order("sort_weight", { ascending: false }).order("created_at", { ascending: false }));
  const ids = rows.map((r) => r.id);
  let units = [];
  if (ids.length) units = await fetchAll("complex_units", "*", (q) => q.in("complex_id", ids).order("sort_weight", { ascending: true }));
  const byC = new Map();
  for (const u of units) { if (!byC.has(u.complex_id)) byC.set(u.complex_id, []); byC.get(u.complex_id).push(u); }
  return rows.map((r) => {
    const us = byC.get(r.id) || [];
    const avail = us.filter((u) => u.available !== false && num(u.price) > 0);
    const minUnit = avail.length ? Math.min(...avail.map((u) => num(u.price))) : null;
    return publicComplex({ ...r, units: us, unitsCount: us.length, unitMinPrice: minUnit });
  });
});

export async function getPublishedComplexes() { return loadPublished(); }

export async function getComplexBySlug(slug) {
  const list = await loadPublished();
  return list.find((c) => c.slug === slug) || null;
}

// Районы для фильтра — только из опубликованных ЖК выбранного города.
export function districtsOf(list, city) {
  const set = new Set();
  for (const c of list) if ((!city || c.city === city) && c.district) set.add(String(c.district).trim());
  return [...set].sort();
}

// Фильтрация + сортировка. f: { city, district, kind, pmin, pmax, year, installment, sea, tag[], sort, q }
export function filterComplexes(list, f = {}) {
  let out = list.slice();
  if (f.city) out = out.filter((c) => c.city === f.city);
  if (f.district) out = out.filter((c) => String(c.district || "").trim() === f.district);
  if (f.kind && COMPLEX_KINDS.includes(f.kind)) out = out.filter((c) => c.kind === f.kind || (f.kind !== "mixed" && c.kind === "mixed"));
  if (num(f.pmin)) out = out.filter((c) => num(c.price_from) != null && num(c.price_from) >= num(f.pmin));
  if (num(f.pmax)) out = out.filter((c) => num(c.price_from) != null && num(c.price_from) <= num(f.pmax));
  if (f.year === "done") out = out.filter((c) => c.completed);
  else if (num(f.year)) out = out.filter((c) => c.completed || (num(c.completion_year) != null && num(c.completion_year) <= num(f.year)));
  if (f.installment === "1") out = out.filter((c) => complexTags(c).installment);
  if (f.sea === "1") out = out.filter((c) => complexTags(c).sea);
  const tags = Array.isArray(f.tag) ? f.tag : f.tag ? [f.tag] : [];
  for (const t of tags) out = out.filter((c) => complexTags(c)[t]);
  if (f.q) {
    const n = String(f.q).toLowerCase();
    out = out.filter((c) => [c.name, c.developer, c.district, c.address].filter(Boolean).join(" ").toLowerCase().includes(n));
  }
  const sort = f.sort || "popular";
  const by = {
    popular: (a, b) => (b.featured - a.featured) || (b.sort_weight - a.sort_weight) || (b.views - a.views),
    price_asc: (a, b) => (num(a.price_from) ?? Infinity) - (num(b.price_from) ?? Infinity),
    price_desc: (a, b) => (num(b.price_from) ?? 0) - (num(a.price_from) ?? 0),
    roi: (a, b) => (num(b.roi_percent) ?? -1) - (num(a.roi_percent) ?? -1),
    soon: (a, b) => (a.completed ? 0 : (num(a.completion_year) ?? 9999) * 10 + (num(a.completion_q) ?? 9)) - (b.completed ? 0 : (num(b.completion_year) ?? 9999) * 10 + (num(b.completion_q) ?? 9)),
    new: (a, b) => String(b.created_at).localeCompare(String(a.created_at)),
  };
  out.sort(by[sort] || by.popular);
  return out;
}

// ---------- админка ----------

export async function adminListComplexes() {
  if (!supa) return [];
  const rows = await fetchAll("complexes", "id, slug, status, featured, sort_weight, name, kind, city, district, price_from, completion_year, completed, updated_at, cover, photos", (q) => q.order("updated_at", { ascending: false }));
  const ids = rows.map((r) => r.id);
  let counts = new Map();
  if (ids.length) {
    const us = await fetchAll("complex_units", "complex_id", (q) => q.in("complex_id", ids));
    for (const u of us) counts.set(u.complex_id, (counts.get(u.complex_id) || 0) + 1);
  }
  return rows.map((r) => ({ ...r, unitsCount: counts.get(r.id) || 0 }));
}

export async function adminGetComplex(id) {
  if (!supa || !id) return null;
  const { data } = await supa.from("complexes").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const { data: units } = await supa.from("complex_units").select("*").eq("complex_id", id).order("sort_weight", { ascending: true }).order("created_at", { ascending: true });
  return { ...data, units: units || [] };
}

// Уникальный slug: из названия, при совпадении — с числовым суффиксом.
export async function uniqueSlug(name, excludeId) {
  const base = slugify(name || "zhk").slice(0, 60) || "zhk";
  const { data } = await supa.from("complexes").select("id, slug").like("slug", `${base}%`);
  const taken = new Set((data || []).filter((r) => r.id !== excludeId).map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now()}`;
}

// Нормализация формы ЖК (сервер не доверяет клиенту): типы, диапазоны, обрезка строк.
export function normalizeComplexInput(b = {}) {
  const s = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max) || null);
  const bool = (v) => v === true || v === "true" || v === 1 || v === "1";
  const int = (v, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const dec = (v, lo, hi) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const photos = Array.isArray(b.photos) ? b.photos.filter((u) => /^https?:\/\//i.test(String(u))).slice(0, 30) : [];
  return {
    name: s(b.name, 120),
    kind: COMPLEX_KINDS.includes(b.kind) ? b.kind : "apartments",
    status: COMPLEX_STATUSES.includes(b.status) ? b.status : "draft",
    featured: bool(b.featured),
    sort_weight: int(b.sort_weight, -1000, 1000) ?? 0,
    developer: s(b.developer, 120),
    city: s(b.city, 60) || "Батуми",
    district: s(b.district, 80),
    address: s(b.address, 200),
    lat: dec(b.lat, -90, 90),
    lng: dec(b.lng, -180, 180),
    desc_ru: s(b.desc_ru, 4000), desc_en: s(b.desc_en, 4000), desc_ka: s(b.desc_ka, 4000),
    nearby_ru: s(b.nearby_ru, 2000), nearby_en: s(b.nearby_en, 2000), nearby_ka: s(b.nearby_ka, 2000),
    price_from: dec(b.price_from, 1, 100000),
    area_from: dec(b.area_from, 1, 10000),
    completion_q: int(b.completion_q, 1, 4),
    completion_year: int(b.completion_year, 2000, 2100),
    completed: bool(b.completed),
    installment_months: int(b.installment_months, 0, 240),
    sea_distance_m: int(b.sea_distance_m, 0, 100000),
    roi_percent: dec(b.roi_percent, 0, 100),
    premium: bool(b.premium), renovated: bool(b.renovated), for_investment: bool(b.for_investment), eco: bool(b.eco),
    amenities: s(b.amenities, 500),
    photos,
    cover: /^https?:\/\//i.test(String(b.cover || "")) ? String(b.cover).trim() : null,
    expert_id: /^[0-9a-f-]{36}$/i.test(String(b.expert_id || "")) ? b.expert_id : null,
    contract_note: s(b.contract_note, 2000),
  };
}

export function normalizeUnitInput(b = {}) {
  const s = (v, max = 120) => (v == null ? null : String(v).trim().slice(0, max) || null);
  const int = (v, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  const dec = (v, lo, hi) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
  return {
    label: s(b.label),
    rooms: int(b.rooms, 0, 20),
    area: dec(b.area, 1, 10000),
    price: dec(b.price, 1, 100000000),
    floor: s(b.floor, 40),
    available: b.available !== false && b.available !== "false" && b.available !== "0",
    plan_photo: /^https?:\/\//i.test(String(b.plan_photo || "")) ? String(b.plan_photo).trim() : null,
    sort_weight: int(b.sort_weight, -1000, 1000) ?? 0,
  };
}
