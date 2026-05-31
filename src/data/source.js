// Единая точка данных: Supabase (одобренные объявления) + Google-таблица (ручной ввод) + локальный фолбэк.
import { BUILDINGS as LOCAL } from "./data";
import { fetchSheet, slugify } from "./sheet";
import { supa } from "@/lib/supabase";

const KIND_COMPLEX = /жк|новострой|комплекс|complex/i;

// Строки listings (одна = один лот) → структура домов с units[].
function groupRows(rows) {
  const by = new Map();
  rows.forEach((r) => {
    const name = r.building_name || "Объект";
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
        image: (r.photos && r.photos[0]) || "/placeholder-baylux.jpg",
        about: r.about || "",
        units: [],
      });
    }
    const b = by.get(slug);
    if ((!b.image || b.image === "/placeholder-baylux.jpg") && r.photos && r.photos[0]) b.image = r.photos[0];
    const boost = parseInt(r.boost, 10) || 0;
    if (boost > (b.boost || 0)) b.boost = boost;
    if (r.complex && !b.complex) b.complex = r.complex;
    const uslug = slugify(name + "-" + (r.type || "") + "-" + (r.price || b.units.length + 1));
    b.units.push({
      id: String(r.id || slug + "-" + b.units.length),
      slug: uslug,
      deal: r.deal || "sale",
      type: r.type || "Квартира",
      rooms: r.rooms ? parseInt(r.rooms, 10) : 0,
      area: r.area ? parseInt(r.area, 10) : 0,
      floor: r.floor || "—",
      price: r.price || "—",
      per: r.per || "",
      unit_image: (r.photos && r.photos[0]) || "",
      photos: Array.isArray(r.photos) ? r.photos : [],
      contact: r.contact || "",
      phone: r.phone || "",
      tg_username: r.tg_username || "",
      year: r.year || "",
      bathrooms: r.bathrooms ? parseInt(r.bathrooms, 10) : 0,
      complex: r.complex || "",
      amenities: typeof r.amenities === "string" && r.amenities ? r.amenities.split(",").map((s) => s.trim()).filter(Boolean) : (Array.isArray(r.amenities) ? r.amenities : []),
      noCommission: !!r.no_commission,
      currency: r.currency === "GEL" ? "GEL" : "USD",
      priceNum: r.price_num != null ? Number(r.price_num) : null,
      boost,
    });
  });
  return Array.from(by.values()).filter((b) => b.units.length > 0);
}

async function fetchSupabase() {
  if (!supa) return [];
  try {
    const { data, error } = await supa
      .from("listings")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return groupRows(data);
  } catch (e) {
    console.error("Supabase load failed:", e.message);
    return [];
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

async function getBuildings() {
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
  // Продвигаемые объекты — выше (boost ставится вручную; оплата позже)
  return list.slice().sort((a, b) => (b.boost || 0) - (a.boost || 0));
}

export async function getBuildingsList() {
  return getBuildings();
}

export async function getAllUnits() {
  const bs = await getBuildings();
  return bs
    .flatMap((b) => b.units.map((u) => ({ ...u, building: b, img: u.unit_image || b.image })))
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
    if (u) return { ...u, building: b, img: u.unit_image || b.image };
  }
  return null;
}
