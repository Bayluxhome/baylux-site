// Единая точка данных: Supabase (одобренные объявления) + Google-таблица (ручной ввод) + локальный фолбэк.
import { BUILDINGS as LOCAL } from "./data";
import { fetchSheet, slugify, cleanAddress, cleanDesc } from "./sheet";
import { supa } from "@/lib/supabase";
import { cache } from "react";

const KIND_COMPLEX = /жк|новострой|комплекс|complex/i;

// Строки listings (одна = один лот) → структура домов с units[].
function groupRows(rows) {
  const by = new Map();
  rows.forEach((r) => {
    const name = cleanAddress(r.building_name) || "Объект";
    const slug = slugify(name);
    if (!by.has(slug)) {
      by.set(slug, {
        slug,
        name,
        kind: KIND_COMPLEX.test(r.kind || "") ? "complex" : "house",
        district: r.district || "Батуми",
        developer: r.developer || "",
        yearBuilt: r.year || "",
        lat: Number(r.lat) || 41.64,
        lng: Number(r.lng) || 41.63,
        image: r.facade_photo || (r.photos && r.photos[0]) || "/placeholder-baylux.jpg",
        about: cleanDesc(r.about),
        lang: r.lang || "ru",
        desc_ru: cleanDesc(r.desc_ru), desc_en: cleanDesc(r.desc_en), desc_ka: cleanDesc(r.desc_ka),
        // Чистим и переведённые названия: карточки/страницы показывают name_<lang> в первую очередь,
        // а они в базе хранятся с тем же markdown-мусором, что и адрес.
        name_ru: cleanAddress(r.name_ru), name_en: cleanAddress(r.name_en), name_ka: cleanAddress(r.name_ka),
        units: [],
      });
    }
    const b = by.get(slug);
    if (r.facade_photo) b.image = r.facade_photo; // фото фасада всегда приоритетнее для обложки дома
    else if ((!b.image || b.image === "/placeholder-baylux.jpg") && r.photos && r.photos[0]) b.image = r.photos[0];
    const boost = parseInt(r.boost, 10) || 0;
    if (boost > (b.boost || 0)) b.boost = boost;
    if (r.complex && !b.complex) b.complex = r.complex;
    const uslug = slugify(name + "-" + (r.type || "") + "-" + (r.price || b.units.length + 1));
    const dealU = r.deal || "sale";
    const areaN = r.area ? parseInt(r.area, 10) : 0;
    const pNum = r.price_num != null ? Number(r.price_num) : (parseInt(String(r.price || "").replace(/[^\d]/g, ""), 10) || null);
    const curU = r.currency === "GEL" ? "GEL" : (/₾|gel|лар/i.test(String(r.price || "")) ? "GEL" : "USD");
    const perM2 = (dealU === "sale" && areaN > 0 && pNum) ? Math.round(pNum / areaN) : null;
    b.units.push({
      id: String(r.id || slug + "-" + b.units.length),
      slug: uslug,
      deal: dealU,
      type: r.type || "Квартира",
      rooms: r.rooms ? parseInt(r.rooms, 10) : 0,
      area: areaN,
      floor: r.floor || "—",
      price: r.price || "—",
      per: r.per || "",
      unit_image: (r.photos && r.photos[0]) || "",
      photos: Array.isArray(r.photos) ? r.photos : [],
      photo_hashes: Array.isArray(r.photo_hashes) ? r.photo_hashes : [],
      created_at: r.created_at || "",
      contact: r.contact || "",
      phone: r.phone || "",
      tg_username: r.tg_username || "",
      year: r.year || "",
      bathrooms: r.bathrooms ? parseInt(r.bathrooms, 10) : 0,
      complex: r.complex || "",
      amenities: typeof r.amenities === "string" && r.amenities ? r.amenities.split(",").map((s) => s.trim()).filter(Boolean) : (Array.isArray(r.amenities) ? r.amenities : []),
      noCommission: !!r.no_commission,
      managed: !!r.managed_by_baylux,
      currency: curU,
      priceNum: pNum,
      perM2,
      boost,
      about: cleanDesc(r.about),
      lang: r.lang || "ru",
      desc_ru: cleanDesc(r.desc_ru), desc_en: cleanDesc(r.desc_en), desc_ka: cleanDesc(r.desc_ka),
    });
  });
  return Array.from(by.values()).filter((b) => b.units.length > 0);
}

const ARCHIVE_DAYS = 30; // сколько дней объявление живёт на сайте до архива

async function fetchSupabase() {
  if (!supa) return [];
  // PostgREST отдаёт максимум 1000 строк за запрос — тянем постранично, пока не кончатся.
  const PAGE = 1000;
  const all = [];
  // Объявление живёт ARCHIVE_DAYS дней с момента публикации/поднятия, затем уходит в архив (скрывается).
  // Исключение — объекты под управлением Baylux: висят постоянно.
  const cutoff = new Date(Date.now() - ARCHIVE_DAYS * 864e5).toISOString();
  try {
    for (let page = 0; page < 50; page++) { // потолок 50 000 объектов, с большим запасом
      const from = page * PAGE;
      const { data, error } = await supa
        .from("listings")
        .select("*")
        .eq("status", "approved")
        .or(`managed_by_baylux.eq.true,bumped_at.is.null,bumped_at.gte.${cutoff}`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false }) // уникальный тай-брейк, чтобы страницы не дублировались
        .range(from, from + PAGE - 1);
      if (error) { console.error("Supabase load failed:", error.message); break; }
      if (!data || data.length === 0) break;
      all.push(...data);
      if (data.length < PAGE) break; // последняя страница
    }
    return groupRows(all);
  } catch (e) {
    console.error("Supabase load failed:", e.message);
    return groupRows(all); // вернём то, что успели собрать
  }
}

// Объединяем дома из разных источников по slug (units складываются).
function mergeBuildings(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const b of list) {
      if (!map.has(b.slug)) map.set(b.slug, { ...b, units: [...b.units] });
      else map.get(b.slug).units.push(...b.units);
    }
  }
  return Array.from(map.values());
}

// Ключ-фолбэк для дублей без фото-хэшей: адрес(дом)+площадь+комнаты+цена.
function dupeFallbackKey(u, b) {
  return [b.name || "", u.area || 0, u.rooms || 0, String(u.price || "")].join("|").toLowerCase();
}

// Объединяем дубли. Главный критерий — совпадение хотя бы одного photo_hash;
// фолбэк (если у юнита нет хэшей) — адрес+площадь+комнаты+цена.
// Из группы остаётся один primary (больше фото, затем новее), у него dupeCount и dupes[].
function dedupeUnits(buildings) {
  const items = [];
  buildings.forEach((b) => b.units.forEach((u) => items.push({ u, b })));
  const n = items.length;
  if (!n) return buildings;
  const parent = items.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, c) => { const ra = find(a), rc = find(c); if (ra !== rc) parent[ra] = rc; };

  const hashFirst = new Map(); // photo_hash -> индекс первого юнита с ним
  const fbFirst = new Map();   // фолбэк-ключ -> индекс
  items.forEach(({ u, b }, i) => {
    const hashes = Array.isArray(u.photo_hashes) ? u.photo_hashes.filter(Boolean) : [];
    if (hashes.length) {
      hashes.forEach((h) => { if (hashFirst.has(h)) union(i, hashFirst.get(h)); else hashFirst.set(h, i); });
    } else {
      const k = dupeFallbackKey(u, b);
      if (fbFirst.has(k)) union(i, fbFirst.get(k)); else fbFirst.set(k, i);
    }
  });

  const groups = new Map();
  for (let i = 0; i < n; i++) { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }

  const remove = new Set(); // юниты-дубли (объекты), которые не показываем отдельно
  for (const idxs of groups.values()) {
    if (idxs.length < 2) continue;
    idxs.sort((a, c) => {
      const pa = items[a].u.photos?.length || 0, pc = items[c].u.photos?.length || 0;
      if (pc !== pa) return pc - pa; // больше фото — главнее
      return String(items[c].u.created_at || "").localeCompare(String(items[a].u.created_at || "")); // затем новее
    });
    const primary = items[idxs[0]].u;
    const others = idxs.slice(1).map((j) => items[j].u);
    primary.dupeCount = others.length;
    primary.dupes = others.map((o) => ({ id: o.id, price: o.price, photo: o.unit_image || (o.photos && o.photos[0]) || "" }));
    others.forEach((o) => remove.add(o));
  }
  if (!remove.size) return buildings;
  return buildings.map((b) => ({ ...b, units: b.units.filter((u) => !remove.has(u)) }));
}

const getBuildings = cache(async () => {
  const fromSupa = await fetchSupabase();
  let fromSheet = [];
  const url = process.env.SHEET_CSV_URL;
  if (url) {
    try {
      fromSheet = await fetchSheet(url);
    } catch (e) {
      console.error("Sheet load failed:", e.message);
    }
  }
  const merged = mergeBuildings(fromSupa, fromSheet);
  const list = merged.length ? merged : LOCAL;
  // Обогащаем цену/валюту/цену за м² для ВСЕХ источников (Sheet/локальные без price_num)
  const enriched = list.map((b) => ({ ...b, units: b.units.map(enrichUnit) }));
  // Скрываем с сайта объявления без собственных фото.
  // Действует на все источники сразу (Supabase/Sheet/локальные), т.к. getAllUnits и getBuildingsList идут сюда.
  const withPhotos = enriched
    .map((b) => ({ ...b, units: b.units.filter((u) => Array.isArray(u.photos) && u.photos.length > 0) }));
  // Объединяем дубли (по совпадению фото; фолбэк — адрес+площадь+комнаты+цена), затем убираем пустые дома.
  const deduped = dedupeUnits(withPhotos).filter((b) => b.units.length > 0);
  // Продвигаемые объекты — выше (boost ставится вручную; оплата позже)
  return deduped.sort((a, b) => (b.boost || 0) - (a.boost || 0));
});

export async function getBuildingsList() {
  return getBuildings();
}

// Реальное число объектов по городам (для меню выбора города в шапке) — считается из того,
// что фактически на сайте, и меняется при публикации/удалении.
export async function getCityCounts() {
  try {
    const buildings = await getBuildings();
    const counts = {};
    for (const b of buildings) {
      const d = b.district || "Батуми";
      counts[d] = (counts[d] || 0) + b.units.length;
    }
    return counts;
  } catch (e) {
    return null;
  }
}

// Доп. обогащение цены (для локальных/сторонних данных без price_num)
function enrichUnit(u) {
  if (u.currency) return u; // из groupRows уже посчитано
  const pNum = parseInt(String(u.price || "").replace(/[^\d]/g, ""), 10) || null;
  const currency = /₾|gel|лар/i.test(String(u.price || "")) ? "GEL" : "USD";
  const perM2 = (u.deal === "sale" && u.area > 0 && pNum) ? Math.round(pNum / u.area) : null;
  return { ...u, priceNum: pNum, currency, perM2 };
}

export async function getAllUnits() {
  const bs = await getBuildings();
  return bs
    .flatMap((b) => b.units.map((u) => ({ ...enrichUnit(u), building: b, img: u.unit_image || b.image })))
    .sort((a, b) => (b.boost || 0) - (a.boost || 0));
}

export async function findBuilding(slug) {
  const bs = await getBuildings();
  return bs.find((b) => b.slug === slug) || null;
}

export async function findUnit(slug) {
  const bs = await getBuildings();
  for (const b of bs) {
    const u = b.units.find((x) => x.slug === slug);
    if (u) return { ...enrichUnit(u), building: b, img: u.unit_image || b.image };
  }
  return null;
}
