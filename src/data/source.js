// Единая точка данных: Supabase (одобренные объявления) + Google-таблица (ручной ввод) + локальный фолбэк.
import { BUILDINGS as LOCAL } from "./data";
import { fetchSheet, slugify, cleanAddress, cleanDesc } from "./sheet";
import { supa } from "@/lib/supabase";
import { stripPrivateBuilding } from "@/lib/privacy";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { assessCoords, CITY_CENTER } from "@/lib/geo";
import { normDeal, normType } from "@/lib/classify";
import { PHONE } from "@/config";

const KIND_COMPLEX = /жк|новострой|комплекс|complex/i;

// Строки listings (одна = один лот) → структура домов с units[].
// Без фолбэков: объявление с неизвестной сделкой публично не показывается (см. лог), тип без
// сопоставления остаётся «как есть» (категория other), координаты вне города/Грузии → null
// (объект остаётся в списке, но не ставится в чужой город на карте).
// ── Группировка объявлений в дома (02.10.2026) ──
// Раньше дом = только адрес. Форма подачи подставляет адрес по точке на карте, и у риелторов
// разные ЖК в районе Адлиа получили один адрес «Улица Адлиа, 1» — сайт склеил Marina Club,
// Оптиму и Sunset в один «дом» с координатами первого объявления. Теперь дом = адрес + ЖК
// (название нормализуется: «Marina Club» = «MARINACLUB») + близость точек (не дальше GROUP_RADIUS_M).
const GROUP_RADIUS_M = 120;
const normComplex = (s) => String(s || "")
  .toLowerCase()
  .replace(/^\s*(жк|ж\.к\.|жилой комплекс|residential complex|complex)\s+/i, "")
  .replace(/[^a-zа-яё0-9ა-ჿ]+/gi, "");
function distM(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toR, dLng = (b.lng - a.lng) * toR;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function groupRows(rows) {
  const by = new Map();      // slug дома → дом
  const groups = new Map();  // ключ «адрес|ЖК» → дома с этим ключом (делятся по расстоянию)
  const usedUnitSlugs = new Set();
  rows.forEach((r) => {
    const dealU = normDeal(r.deal);
    if (!dealU) { console.warn("listing skipped: unknown deal", r.id, r.deal); return; }
    const name = cleanAddress(r.building_name) || "Объект";
    const complexRaw = String(r.complex || "").trim();
    const cxKey = normComplex(complexRaw);
    const key = slugify(name) + "|" + cxKey;
    const geo = assessCoords(r);
    const pt = geo.ok ? { lat: geo.lat, lng: geo.lng } : null;
    if (!groups.has(key)) groups.set(key, []);
    const cands = groups.get(key);
    // Дом с тем же адресом и ЖК: без точки — к первому; с точкой — к ближайшему в радиусе.
    let target = null;
    if (!pt) target = cands[0] || null;
    else target = cands.find((c) => c.lat == null || distM(c, pt) <= GROUP_RADIUS_M) || null;
    let slug;
    if (target) slug = target.slug;
    else {
      const base = slugify(complexRaw ? `${complexRaw} ${name}` : name);
      slug = base;
      for (let i = 2; by.has(slug); i++) slug = `${base}-${i}`;
    }
    if (target && target.lat == null && pt) { target.lat = pt.lat; target.lng = pt.lng; target.geoIssue = ""; }
    if (!by.has(slug)) {
      const nb = {
        slug,
        name,
        kind: KIND_COMPLEX.test(r.kind || "") || cxKey ? "complex" : "house",
        district: r.district || "Батуми",
        developer: r.developer || "",
        yearBuilt: r.year || "",
        lat: geo.ok ? geo.lat : null,
        lng: geo.ok ? geo.lng : null,
        geoIssue: geo.ok ? "" : geo.reason,
        image: r.facade_photo || (r.photos && r.photos[0]) || "/placeholder-baylux.jpg",
        about: cleanDesc(r.about),
        lang: r.lang || "ru",
        desc_ru: cleanDesc(r.desc_ru), desc_en: cleanDesc(r.desc_en), desc_ka: cleanDesc(r.desc_ka),
        // Чистим и переведённые названия: карточки/страницы показывают name_<lang> в первую очередь,
        // а они в базе хранятся с тем же markdown-мусором, что и адрес.
        name_ru: cleanAddress(r.name_ru), name_en: cleanAddress(r.name_en), name_ka: cleanAddress(r.name_ka),
        complex: complexRaw,
        units: [],
      };
      by.set(slug, nb);
      cands.push(nb);
    }
    const b = by.get(slug);
    if (r.facade_photo) b.image = r.facade_photo; // фото фасада всегда приоритетнее для обложки дома
    else if ((!b.image || b.image === "/placeholder-baylux.jpg") && r.photos && r.photos[0]) b.image = r.photos[0];
    const boost = parseInt(r.boost, 10) || 0;
    if (boost > (b.boost || 0)) b.boost = boost;
    if (r.complex && !b.complex) b.complex = r.complex;
    // slug объявления должен быть уникальным на всём сайте. Раньше «адрес-тип-цена» совпадал у
    // разных объявлений (63 совпадения на 02.10.2026: «vake-kvartira-900» ×3 и т.п.) — карточка
    // в каталоге открывала ЧУЖОЕ объявление. Первое (самое новое) сохраняет прежний адрес,
    // остальным добавляется кусок id.
    let uslug = slugify(name + "-" + (r.type || "") + "-" + (r.price || b.units.length + 1));
    if (usedUnitSlugs.has(uslug)) uslug = `${uslug}-${String(r.id || usedUnitSlugs.size).replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
    usedUnitSlugs.add(uslug);
    const areaN = r.area ? parseInt(r.area, 10) : 0;
    const pNum = r.price_num != null ? Number(r.price_num) : (parseInt(String(r.price || "").replace(/[^\d]/g, ""), 10) || null);
    const curU = r.currency === "GEL" ? "GEL" : (/₾|gel|лар/i.test(String(r.price || "")) ? "GEL" : "USD");
    const perM2 = (dealU === "sale" && areaN > 0 && pNum) ? Math.round(pNum / areaN) : null;
    b.units.push({
      id: String(r.id || slug + "-" + b.units.length),
      slug: uslug,
      deal: dealU,
      // Канонический тип если распознан; иначе исходная строка (категория «other», не «квартира»).
      type: normType(r.type) || String(r.type || "").trim(),
      rooms: r.rooms ? parseInt(r.rooms, 10) : 0,
      area: areaN,
      floor: r.floor || "—",
      price: r.price || "—",
      per: r.per || "",
      // Своя точка объявления — карта на карточке объекта ставит её, а не точку «дома».
      lat: pt ? pt.lat : null,
      lng: pt ? pt.lng : null,
      unit_image: (r.photos && r.photos[0]) || "",
      photos: Array.isArray(r.photos) ? r.photos : [],
      photo_hashes: Array.isArray(r.photo_hashes) ? r.photo_hashes : [],
      created_at: r.created_at || "",
      contact: r.contact || "",
      phone: r.phone || "",
      tg_username: r.tg_username || "",
      // Автор объявления — нужен, чтобы связать объект с карточкой риелтора
      // (в таблице realtors связь идёт по tg_user_id или email).
      owner_email: r.owner_email || "",
      tg_user_id: r.tg_user_id != null ? r.tg_user_id : null,
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

const ARCHIVE_DAYS = 60; // сколько дней объявление живёт на сайте до архива

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

// Объединяем дубли. Главный критерий — совпадение хотя бы одного photo_hash И той же площади;
// фолбэк (если у юнита нет хэшей) — адрес+площадь+комнаты+цена.
// Площадь в ключе фото-хэша обязательна: разные квартиры/дома в одном доме часто используют
// одно и то же фото (фасад, баннер агентства, план этажа), но площади у них разные — их НЕЛЬЗЯ
// схлопывать. Настоящий дубль (тот же объект у разных риелторов) имеет и те же фото, и ту же
// площадь, поэтому по-прежнему схлопывается. Из группы остаётся один primary (больше фото,
// затем новее), у него dupeCount и dupes[].
// Объявление риелтора/собственника, а не копия парсера. Парсер грузит через аккаунт админа
// (bulk-listing), поэтому автор есть и у его строк — отличаем по контакту: у копий парсера
// стоит телефон агентства (config PHONE).
const digits = (s) => String(s || "").replace(/\D/g, "");
const isAgencyContact = (u) => { const d = digits(u.contact || u.phone); return !d || d.endsWith(PHONE.slice(-9)); };
const isOwned = (u) => !isAgencyContact(u);

function dedupeUnits(buildings) {
  const items = [];
  buildings.forEach((b) => b.units.forEach((u) => items.push({ u, b })));
  const n = items.length;
  if (!n) return buildings;
  const parent = items.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, c) => { const ra = find(a), rc = find(c); if (ra !== rc) parent[ra] = rc; };

  const hashFirst = new Map(); // (photo_hash + площадь) -> индекс первого такого юнита
  const fbFirst = new Map();   // фолбэк-ключ -> индекс
  items.forEach(({ u, b }, i) => {
    const hashes = Array.isArray(u.photo_hashes) ? u.photo_hashes.filter(Boolean) : [];
    if (hashes.length) {
      const areaKey = "|a" + (u.area || 0); // общее фото схлопывает только при той же площади
      hashes.forEach((h) => { const hk = h + areaKey; if (hashFirst.has(hk)) union(i, hashFirst.get(hk)); else hashFirst.set(hk, i); });
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
      // 02.10.2026: объявление, поданное риелтором/собственником на сайте (есть автор), всегда
      // главнее копии, которую парсер взял из Telegram-группы. Раньше главной могла стать копия
      // парсера (у неё больше фото) — и объект риелтора показывался с телефоном Baylux.
      const oa = isOwned(items[a].u) ? 1 : 0, oc = isOwned(items[c].u) ? 1 : 0;
      if (oa !== oc) return oc - oa;
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

// Запад/восток — по заявленному городу (справочник центров), а не по координатам объекта:
// координаты могут быть неверными или отсутствовать. Неизвестный город → запад (главный рынок).
function cityBucket(b) {
  const c = CITY_CENTER[String(b.district || "").trim()];
  return c && c[1] > 43 ? "east" : "west";
}

// Порядок по умолчанию: чередуем города по кругу (round-robin), чтобы свежая пачка объявлений
// одного города не забивала весь верх выдачи. Внутри города сохраняется исходный порядок
// «новые вперёд» (из запроса created_at DESC). Продвигаемые (boost) — глобально в самом верху.
// Круг начинаем с запада — Батуми — главный рынок компании.
function interleaveByCity(list) {
  const boosted = list.filter((b) => (b.boost || 0) > 0).sort((a, b) => (b.boost || 0) - (a.boost || 0));
  const rest = list.filter((b) => !(b.boost > 0));
  const buckets = new Map();
  for (const b of rest) {
    const k = cityBucket(b);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(b);
  }
  const keys = [...buckets.keys()].sort((a, b) => (a === "west" ? -1 : b === "west" ? 1 : a.localeCompare(b)));
  const lists = keys.map((k) => buckets.get(k));
  const out = [...boosted];
  for (let i = 0; lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]);
  }
  return out;
}

// Сборка всей выдачи: Supabase → таблица → обогащение → дедуп → чередование городов.
// Дорогая операция (2000+ строк), поэтому ниже она обёрнута в кэш между запросами.
async function buildAll() {
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
  // Продвигаемые — выше, остальные чередуются по городам (round-robin), чтобы Батуми
  // не тонул под свежей пачкой Тбилиси. Внутри города — «новые вперёд».
  return interleaveByCity(deduped);
}

// Кэш МЕЖДУ запросами — в памяти серверного процесса. Раньше каждая страница, даже
// «Политика конфиденциальности», заново выкачивала и пересобирала всю базу ради счётчиков
// в шапке: 1,7 с на ответ, под нагрузкой — десятки секунд. Теперь сборка живёт TTL секунд;
// изменение объявлений (модерация, правка, удаление) сбрасывает её через invalidateBuildings().
// Почему память, а не кэш Vercel (unstable_cache): у него лимит 2 МБ на запись, а база
// с описаниями на трёх языках больше. У «тёплого» инстанса кэш есть, у холодного — одна сборка.
// cache() из React сверху — чтобы внутри одного запроса результат не доставался дважды.
// 28.09.2026: TTL 90 с → 5 мин. Сайт упёрся в лимит CPU Vercel (12 ч при 4 ч): каждые 90 с
// каждый инстанс заново собирал всю базу (дедуп по фото, чередование городов), а под
// обходом Googlebot инстансов много. Правки объявлений по-прежнему сбрасывают кэш
// через invalidateBuildings() (на инстансе, принявшем правку; остальные — в пределах TTL).
const TTL_MS = 5 * 60_000;
let memo = { at: 0, promise: null };

// Снимок базы + всё производное от неё считается ОДИН раз на сборку, а не на каждый запрос.
// Раньше каждая карточка объекта заново очищала все ~2400 объявлений (stripPrivate),
// разворачивала их в плоский список дважды (публичный и служебный) и искала линейно.
function buildSnapshot(raw) {
  const pub = raw.map(stripPrivateBuilding);
  const unitsPub = flatten(pub);
  const unitsRaw = flatten(raw);
  // При совпадении slug побеждает первый — как у прежнего линейного find().
  const index = (list) => { const m = new Map(); for (const x of list) if (!m.has(x.slug)) m.set(x.slug, x); return m; };
  const bySlugPub = index(unitsPub);
  const bySlugRaw = index(unitsRaw);
  const buildingBySlug = index(pub);
  // Старые адреса домов (/building/<адрес> до разделения по ЖК, 02.10.2026) → первый дом с этим адресом,
  // чтобы ссылки из выдачи Google и мессенджеров вели на страницу, а не на 404.
  const legacyBuilding = new Map();
  for (const b of pub) {
    const old = slugify(b.name);
    if (old !== b.slug && !buildingBySlug.has(old) && !legacyBuilding.has(old)) legacyBuilding.set(old, b.slug);
  }
  return { raw, pub, unitsPub, unitsRaw, bySlugPub, bySlugRaw, buildingBySlug, legacyBuilding };
}

function getSnapshotShared() {
  const now = Date.now();
  if (memo.promise && now - memo.at < TTL_MS) return memo.promise;
  const p = buildAll().then(buildSnapshot).catch((e) => { memo = { at: 0, promise: null }; throw e; });
  memo = { at: now, promise: p };
  return p;
}
export function invalidateBuildings() { memo = { at: 0, promise: null }; }
const getSnapshot = cache(() => getSnapshotShared());
const getBuildings = cache(async () => (await getSnapshot()).raw);

// Публичная выдача = те же дома, но БЕЗ служебных полей у объявлений.
// Чистим один раз на весь список (в снимке), а не на каждой карточке:
// раньше очистка стояла у мест вывода, одно из них забыли — и owner_email уехал
// в HTML через вложенный building.units. Теперь ни одна страница не может её пропустить.
// Массивы снимка общие для всех запросов — потребители их не мутируют (только filter/slice/[...].sort).
const getBuildingsPublic = cache(async () => (await getSnapshot()).pub);

export async function getBuildingsList() {
  return getBuildingsPublic();
}

// Реальное число объектов по городам (для меню выбора города в шапке) — считается из того,
// что фактически на сайте, и меняется при публикации/удалении.
// Счётчики нужны в шапке КАЖДОЙ страницы. Это крошечный объект, поэтому его держим в кэше
// Vercel (unstable_cache, 5 минут): текстовые страницы («О компании», «Политика») больше
// не собирают всю базу даже на холодном инстансе — им достаточно этих 30 чисел.
const cityCountsCached = unstable_cache(async () => {
  const buildings = await getBuildings();
  const counts = {};
  for (const b of buildings) {
    const d = b.district || "Батуми";
    counts[d] = (counts[d] || 0) + b.units.length;
  }
  return counts;
}, ["city-counts-v1"], { revalidate: 300, tags: ["city-counts"] });

export async function getCityCounts() {
  try { return await cityCountsCached(); } catch (e) { return null; }
}

// Доп. обогащение цены (для локальных/сторонних данных без price_num)
function enrichUnit(u) {
  if (u.currency) return u; // из groupRows уже посчитано
  const pNum = parseInt(String(u.price || "").replace(/[^\d]/g, ""), 10) || null;
  const currency = /₾|gel|лар/i.test(String(u.price || "")) ? "GEL" : "USD";
  const perM2 = (u.deal === "sale" && u.area > 0 && pNum) ? Math.round(pNum / u.area) : null;
  return { ...u, priceNum: pNum, currency, perM2 };
}

// Разворачивает список домов в плоский список объявлений (у каждого — ссылка на свой дом).
function flatten(bs) {
  return bs
    .flatMap((b) => b.units.map((u) => ({ ...enrichUnit(u), building: b, img: u.unit_image || b.image })))
    .sort((a, b) => (b.boost || 0) - (a.boost || 0));
}

// --- Публичные выборки: очищены, их можно отдавать в вёрстку и клиентские компоненты ---

export async function getAllUnits() {
  return (await getSnapshot()).unitsPub;
}

export async function findBuilding(slug) {
  return (await getSnapshot()).buildingBySlug.get(slug) || null;
}

// Новый slug дома для старого адреса (см. legacyBuilding) или null.
export async function legacyBuildingSlug(slug) {
  return (await getSnapshot()).legacyBuilding.get(slug) || null;
}

export async function findUnit(slug) {
  const u = (await getSnapshot()).bySlugPub.get(slug);
  return u ? { ...u } : null;
}

// Служебная копия одного объявления по slug (для сопоставления с риелтором) — без обхода всей базы.
export async function findUnitRaw(slug) {
  return (await getSnapshot()).bySlugRaw.get(slug) || null;
}

// --- Служебная выборка: СО служебными полями (owner_email, tg_user_id, контакты собственника) ---
// Нужна только для серверного сопоставления объявления с карточкой риелтора.
// НЕЛЬЗЯ передавать результат в вёрстку или в пропсы клиентских компонентов —
// поля попадут в HTML страницы. Для вывода берите getAllUnits/findUnit.
export async function getAllUnitsRaw() {
  return (await getSnapshot()).unitsRaw;
}
