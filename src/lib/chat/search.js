// Чат-подборщик (T-20261118-02): поиск по опубликованным объектам.
//
// Чистая функция без серверных импортов: на вход — публичная выдача каталога
// (getAllUnits(): только approved, не в архиве, с фото, дедуп, уже после stripPrivate),
// на выход — 3–5 карточек без каких-либо контактов. Те же правила фильтров, что у /catalog.
// Модуль самодостаточный, чтобы его можно было прогнать тестом на реальной выдаче.
// Подписи карточек (тип, город, адрес, «/ мес», «цена по запросу») — на языке клиента (opts.lang),
// адрес через formatAddress (lib/address.js, без импортов): без смеси алфавитов в одном слове.
import { formatAddress } from "../address.js";

const COAST = new Set(["Батуми", "Кобулети", "Гонио", "Чакви", "Махинджаури", "Сарпи", "Квариати", "Уреки", "Поти"]);

// Город: модель может прислать его на любом языке — приводим к ключу базы (по-русски).
const CITY_ALIASES = {
  "батуми": "Батуми", "batumi": "Батуми", "ბათუმი": "Батуми",
  "тбилиси": "Тбилиси", "tbilisi": "Тбилиси", "თბილისი": "Тбилиси",
  "кобулети": "Кобулети", "kobuleti": "Кобулети", "ქობულეთი": "Кобулети",
  "гонио": "Гонио", "gonio": "Гонио", "გონიო": "Гонио",
  "чакви": "Чакви", "chakvi": "Чакви", "ჩაქვი": "Чакви",
  "махинджаури": "Махинджаури", "makhinjauri": "Махинджаури", "მახინჯაური": "Махинджаури",
  "кутаиси": "Кутаиси", "kutaisi": "Кутаиси", "ქუთაისი": "Кутаиси",
  "рустави": "Рустави", "rustavi": "Рустави", "რუსთავი": "Рустави",
  "бакуриани": "Бакуриани", "bakuriani": "Бакуриани", "ბაკურიანი": "Бакуриани",
  "гудаури": "Гудаури", "gudauri": "Гудаури", "გუდაური": "Гудаури",
  "уреки": "Уреки", "ureki": "Уреки", "ურეკი": "Уреки",
  "квариати": "Квариати", "kvariati": "Квариати", "сарпи": "Сарпи", "sarpi": "Сарпи",
  "поти": "Поти", "poti": "Поти", "мцхета": "Мцхета", "mtskheta": "Мцхета",
  // турецкий, немецкий и др. (тест Мозга 18.11 03:41: «Kiralık daire Batum» → город «Batum»)
  "batum": "Батуми", "батум": "Батуми", "batoumi": "Батуми", "tiflis": "Тбилиси", "тифлис": "Тбилиси", "tbilissi": "Тбилиси",
  "kutais": "Кутаиси", "koboleti": "Кобулети", "çakvi": "Чакви", "cakvi": "Чакви", "mahincauri": "Махинджаури", "makhindzhauri": "Махинджаури",
  "sarp": "Сарпи", "kvariati": "Квариати", "mtsheta": "Мцхета",
};
// Пригороды: объект может стоять в базе с городом «Батуми», а пригород указан в адресе
// (например «Ул. Ахалгазрдоба 16, Махинджаури»). Для них ищем ещё и по тексту адреса.
const SUBURBS = new Set(["Гонио", "Махинджаури", "Чакви", "Сарпи", "Квариати", "Кобулети", "Уреки", "Мцхета"]);
// Если в пригороде ничего нет: ближайший большой город (поиск шире, правило «перед "нет" ищи шире»).
const NEAR_CITY = { "Гонио": "Батуми", "Махинджаури": "Батуми", "Чакви": "Батуми", "Сарпи": "Батуми", "Квариати": "Батуми", "Кобулети": "Батуми", "Уреки": "Батуми", "Поти": "Батуми", "Мцхета": "Тбилиси", "Рустави": "Тбилиси" };
const foldKey = (x) => String(x || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ё/g, "е");
export function normCity(c) {
  const raw = String(c || "").trim().replace(/[.,;]+$/, "");
  const k = raw.toLowerCase();
  if (!k) return "";
  if (CITY_ALIASES[k]) return CITY_ALIASES[k];
  const f = foldKey(raw);
  if (CITY_ALIASES[f]) return CITY_ALIASES[f];
  // «Batum», «Batumi'de», «в Батуми», «Tbilisi city»: ищем известное название как начало слова.
  const words = f.split(/[^a-zа-яა-ჿ]+/i).filter(Boolean);
  for (const w of words) {
    if (CITY_ALIASES[w]) return CITY_ALIASES[w];
    if (w.length >= 4) {
      const hit = Object.keys(CITY_ALIASES).find((key) => key.length >= 4 && (w.startsWith(key) || key.startsWith(w)));
      if (hit) return CITY_ALIASES[hit];
    }
  }
  return raw.replace(/^./, (x) => x.toUpperCase());
}
// Несколько городов в одном поле: «Махинджаури/Гонио», «Gonio, Makhinjauri», «Гонио или Чакви».
export function parseCities(c) {
  if (Array.isArray(c)) return [...new Set(c.map(normCity).filter(Boolean))];
  const parts = String(c || "").split(/\s*(?:[\/,;|+&]|\s(?:или|и|or|and|ve|veya|ან|და)\s)\s*/i).filter(Boolean);
  return [...new Set(parts.map(normCity).filter(Boolean))];
}
// Слово — точно название пригорода/города (без нечёткого поиска): «махинджаури», «gonio».
function knownTown(w) {
  const k = String(w || "").toLowerCase(), f = foldKey(w);
  const c = CITY_ALIASES[k] || CITY_ALIASES[f] || "";
  return SUBURBS.has(c) ? c : "";
}
// Все написания города (для поиска по тексту адреса).
function cityNeedles(city) {
  return [city.toLowerCase(), ...Object.keys(CITY_ALIASES).filter((k) => CITY_ALIASES[k] === city && k.length >= 4)];
}

const DEALS = {
  rent: "rent", sale: "sale", daily: "daily", buy: "sale", purchase: "sale", "long_rent": "rent", "short_rent": "daily",
  rental: "rent", lease: "rent", monthly: "rent", "аренда": "rent", "снять": "rent", "kiralik": "rent", "kira": "rent", "miete": "rent",
  "покупка": "sale", "продажа": "sale", "купить": "sale", "satilik": "sale", "satis": "sale", "kauf": "sale",
  "посуточно": "daily", "посуточная": "daily", "gunluk": "daily", "nightly": "daily", "short": "daily",
};
const normDealArg = (d) => DEALS[String(d || "").toLowerCase()] || DEALS[foldKey(d)] || "";

// Тип: модель может прислать синоним или слово клиента. Офис и коммерция — одна группа
// (в базе офис часто заведён как «Коммерция»): office → сначала офисы, затем коммерция.
const TYPE_SYN = {
  apartment: "apartment", flat: "apartment", "квартира": "apartment", daire: "apartment", wohnung: "apartment",
  studio: "studio", "студия": "studio", stüdyo: "studio", studyo: "studio",
  house: "house", villa: "house", cottage: "house", "дом": "house", ev: "house", haus: "house",
  commercial: "commercial", "коммерция": "commercial", retail: "commercial", shop: "commercial", "магазин": "commercial", dukkan: "commercial", isyeri: "commercial",
  office: "office", "офис": "office", ofis: "office", buro: "office", "büro": "office",
  land: "land", plot: "land", "участок": "land", arsa: "land",
  new: "new", "новостройка": "new", newbuild: "new",
  warehouse: "warehouse", garage: "garage",
};
const normType = (t) => { const k = String(t || "").toLowerCase().trim(); return TYPE_SYN[k] || TYPE_SYN[foldKey(k)] || k; };

// Категория по типу — как unitCat в data/data.js (копия, чтобы модуль был чистым).
export function unitCat(type) {
  const t = (type || "").toLowerCase();
  if (/студи|квартир|апарт|новострой/.test(t)) return "apartment";
  if (/коттедж|вилл|таун|особняк|дом/.test(t)) return "house";
  if (/офис/.test(t)) return "office";
  if (/склад/.test(t)) return "warehouse";
  if (/участ|земл/.test(t)) return "land";
  if (/гараж|паркинг|машино/.test(t)) return "garage";
  if (/коммерц|ритейл|торг/.test(t)) return "commercial";
  return "other";
}
const isNew = (u) => u.isNew === true || /новострой/i.test(u.type || "");
const priceVal = (u) => u.priceNum || (parseInt(String(u.price || "").replace(/[^\d]/g, ""), 10) || 0);

// Цена объекта в USD (база хранит USD или GEL).
function priceUsd(u, rate) {
  const v = priceVal(u);
  if (!v) return 0;
  return u.currency === "GEL" ? v / (rate || 2.7) : v;
}

// «У моря»: отметки в удобствах/тексте; в приморском городе без отметок объект не отбрасываем,
// а ставим ниже (рейтинг), чтобы не выдумывать близость к морю.
const SEA_RE = /рядом (с )?мор|у моря|перв(ая|ой) лини|вид на море|море в|\bsea\b|seaview|sea view|beach|ზღვ/i;
function seaScore(u) {
  const am = Array.isArray(u.amenities) ? u.amenities.join(" ") : String(u.amenities || "");
  const txt = [am, u.about, u.desc_ru, u.desc_en, u.building?.about].filter(Boolean).join(" ");
  if (/перв(ая|ой) лини/i.test(txt)) return 2;
  return SEA_RE.test(txt) ? 1 : 0;
}

// Цена за м² в USD (только если известны и цена, и площадь).
function ppmUsd(u, rate) {
  const p = priceUsd(u, rate), ar = Number(u.area) || 0;
  return p > 0 && ar > 0 ? p / ar : 0;
}

function floorNum(u) { const m = String(u.floor || "").match(/\d+/); return m ? parseInt(m[0], 10) : null; }

// Подписи на языке клиента.
const L = {
  ru: { month: " / мес", night: " / ночь", req: "цена по запросу", rooms: "комн.", noRooms: "комнаты не указаны", m2: "м²" },
  en: { month: " / month", night: " / night", req: "price on request", rooms: "rooms", noRooms: "rooms not specified", m2: "m²" },
  ka: { month: " / თვე", night: " / ღამე", req: "ფასი მოთხოვნით", rooms: "ოთახი", noRooms: "ოთახები არ არის მითითებული", m2: "მ²" },
};
const TYPE_L = {
  en: { "Квартира": "Apartment", "Студия": "Studio", "Дом": "House", "Коммерция": "Commercial", "Офис": "Office", "Участок": "Land", "Гараж": "Garage", "Новостройка": "New building", "Апартаменты": "Apartment", "Коттедж": "Cottage", "Вилла": "Villa", "Таунхаус": "Townhouse", "Склад": "Warehouse" },
  ka: { "Квартира": "ბინა", "Студия": "სტუდიო", "Дом": "სახლი", "Коммерция": "კომერციული", "Офис": "ოფისი", "Участок": "მიწის ნაკვეთი", "Гараж": "ავტოფარეხი", "Новостройка": "ახალი აშენებული", "Апартаменты": "აპარტამენტი", "Коттедж": "კოტეჯი", "Вилла": "ვილა", "Таунхаус": "თაუნჰაუსი", "Склад": "საწყობი" },
};
const CITY_L = {
  en: { "Батуми": "Batumi", "Тбилиси": "Tbilisi", "Кобулети": "Kobuleti", "Гонио": "Gonio", "Чакви": "Chakvi", "Махинджаури": "Makhinjauri", "Кутаиси": "Kutaisi", "Рустави": "Rustavi", "Бакуриани": "Bakuriani", "Гудаури": "Gudauri", "Уреки": "Ureki", "Квариати": "Kvariati", "Сарпи": "Sarpi", "Поти": "Poti", "Мцхета": "Mtskheta" },
  ka: { "Батуми": "ბათუმი", "Тбилиси": "თბილისი", "Кобулети": "ქობულეთი", "Гонио": "გონიო", "Чакви": "ჩაქვი", "Махинджаури": "მახინჯაური", "Кутаиси": "ქუთაისი", "Рустави": "რუსთავი", "Бакуриани": "ბაკურიანი", "Гудаури": "გუდაური", "Уреки": "ურეკი", "Квариати": "კვარიათი", "Сарпи": "სარფი", "Поти": "ფოთი", "Мцхета": "მცხეთა" },
};
const langOf = (x) => (L[x] ? x : "ru");

function addrLabel(u, lang) {
  const b = u.building || {};
  const raw = b["name_" + lang] || b.name || "";
  try { return formatAddress(raw, lang, b.kind) || raw; } catch { return raw; }
}

// Подпись цены для ответа.
function priceLabel(u, lang = "ru") {
  const l = L[langOf(lang)];
  const v = priceVal(u);
  if (!v) return l.req;
  const s = (u.currency === "GEL" ? "₾" : "$") + String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return s + (u.deal === "rent" ? l.month : u.deal === "daily" ? l.night : "");
}

// Карточка для модели: только публичные поля и ссылка. Никаких контактов.
export function toCard(u, rate, lang = "ru") {
  const lg = langOf(lang), l = L[lg];
  const ppm = u.deal === "sale" ? ppmUsd(u, rate) : 0;
  const type = lg === "ru" ? u.type : (TYPE_L[lg][u.type] || u.type);
  const city = u.building?.district || "";
  return {
    id: String(u.id),
    title: [type, u.rooms ? `${u.rooms} ${lg === "en" && u.rooms === 1 ? "room" : l.rooms}` : (u.type === "Студия" ? "" : l.noRooms), u.area ? `${u.area} ${l.m2}` : ""].filter(Boolean).join(", "),
    deal: u.deal,
    price: priceLabel(u, lg),
    ...(ppm ? { price_per_m2: "$" + String(Math.round(ppm)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " / " + l.m2 } : {}),
    city: lg === "ru" ? city : (CITY_L[lg][city] || city),
    address: addrLabel(u, lg),
    complex: u.complex || u.building?.complex || "",
    floor: u.floor && u.floor !== "—" ? String(u.floor) : "",
    new_building: isNew(u),
    sea: seaScore(u) > 0,
    url: `/property/${u.slug}`,
  };
}

/**
 * Поиск по публичной выдаче.
 * args: { city, deal: rent|daily|sale, type: apartment|studio|house|commercial|new, rooms, budget_max, budget_min,
 *         currency: USD|GEL, district (текст: район/улица/ЖК), area_min, area_max, floor_min, floor_max, near_sea, limit }
 *         price_per_m2_max, price_per_m2_min (цена за м² в USD: цена / площадь, GEL пересчитывается по курсу)
 * Возвращает { total (полное число совпадений), shown, items: [карточки], relaxed: [какие условия ослаблены],
 *              catalog_url (ссылка на каталог), catalog_exact (каталог показывает ровно эти total объектов) }.
 */
const CAT_TYPES = new Set(["apartment", "house", "commercial", "office", "land", "warehouse", "garage"]);

// Ссылка на каталог с теми фильтрами, которые каталог умеет (deal, city, cat/new, rooms, pmin/pmax, amin/amax).
// Фильтра «цена за м²», этажа, района и «у моря» в каталоге нет: тогда ссылка шире выдачи (exact=false).
function catalogLink({ deal, city, type, rooms, a, bmin, bmax, ppm, sort }) {
  const p = new URLSearchParams();
  let exact = true;
  if (deal) p.set("deal", deal);
  if (city) p.set("city", city);
  if (type === "new") p.set("new", "1");
  else if (type === "studio") p.set("rooms", "0");
  else if (CAT_TYPES.has(type)) p.set("cat", type);
  else if (type) exact = false;
  if (rooms != null && !Number.isNaN(rooms) && type !== "studio") p.set("rooms", String(Math.min(4, Math.max(0, rooms))));
  if (ppm) {
    exact = false; // каталог не фильтрует по цене за м²: даём каталог по сделке/городу, от дешёвых
    p.set("sort", "price_asc");
  } else {
    if (sort === "price_asc" || sort === "price_desc") p.set("sort", sort);
    // каталог сравнивает цену без пересчёта валют: бюджет передаём только в USD
    if (String(a.currency || "").toUpperCase() === "GEL") { if (bmin || bmax) exact = false; }
    else { if (bmin) p.set("pmin", String(Math.round(bmin))); if (bmax) p.set("pmax", String(Math.round(bmax))); }
  }
  if (a.area_min) p.set("amin", String(Math.round(Number(a.area_min))));
  if (a.area_max) p.set("amax", String(Math.round(Number(a.area_max))));
  if (a.floor_min || a.floor_max || String(a.district || "").trim() || a.near_sea === true || a.near_sea === "true") exact = false;
  const qs = p.toString();
  return { url: "/catalog" + (qs ? "?" + qs : ""), exact };
}

// Сортировка: price_asc (запросы «недорого», «дешевле», «cheap»), price_desc, newest, ppm_asc.
const SORTS = new Set(["price_asc", "price_desc", "newest", "ppm_asc"]);

// Строгий отбор по всем условиям. Возвращает { list, relaxed }.
function filterUnits(units, q, rate) {
  const { cities, deal, type, rooms, bmin, bmax, district, nearSea, ppmMin, ppmMax, a } = q;
  let list = Array.isArray(units) ? units : [];
  if (deal) list = list.filter((u) => u.deal === deal);
  if (deal === "daily") list = list.filter((u) => ["apartment", "house"].includes(unitCat(u.type)));
  if (cities.length) {
    list = list.filter((u) => {
      const d = u.building?.district || "";
      if (cities.includes(d)) return true;
      // пригород в адресе объекта, заведённого под соседним городом
      const sub = cities.filter((c) => SUBURBS.has(c));
      if (!sub.length) return false;
      const hay = [u.building?.name, u.building?.name_en, u.building?.name_ka, u.complex, u.building?.complex].filter(Boolean).join(" ").toLowerCase();
      return sub.some((c) => cityNeedles(c).some((n) => hay.includes(n)));
    });
  }
  if (type === "new") list = list.filter(isNew);
  else if (type === "studio") list = list.filter((u) => u.type === "Студия");
  else if (type === "office" || type === "commercial") list = list.filter((u) => ["office", "commercial"].includes(unitCat(u.type)));
  else if (type) list = list.filter((u) => unitCat(u.type) === type);
  if (bmin) list = list.filter((u) => priceUsd(u, rate) >= bmin);
  if (bmax) list = list.filter((u) => { const p = priceUsd(u, rate); return p > 0 && p <= bmax; });
  if (ppmMin) list = list.filter((u) => ppmUsd(u, rate) >= ppmMin);
  if (ppmMax) list = list.filter((u) => { const v = ppmUsd(u, rate); return v > 0 && v <= ppmMax; });
  if (a.area_min) list = list.filter((u) => (u.area || 0) >= Number(a.area_min));
  if (a.area_max) list = list.filter((u) => (u.area || 0) > 0 && u.area <= Number(a.area_max));
  if (a.floor_min) list = list.filter((u) => { const f = floorNum(u); return f != null && f >= Number(a.floor_min); });
  if (a.floor_max) list = list.filter((u) => { const f = floorNum(u); return f != null && f <= Number(a.floor_max); });
  if (district) {
    // «Махинджаури/Гонио», «Ваке или Сабуртало» → любой из вариантов; слова внутри варианта — все.
    const groups = district.split(/\s*(?:[\/,;|]|\s(?:или|or|veya|ან)\s)\s*/i).map((g) => g.split(/\s+/).filter(Boolean)).filter((g) => g.length);
    list = list.filter((u) => {
      const hay = [u.building?.name, u.building?.name_en, u.building?.name_ka, u.building?.district, u.complex, u.building?.complex, u.about, u.desc_ru, u.desc_en].filter(Boolean).join(" ").toLowerCase();
      return groups.some((g) => g.every((n) => hay.includes(n) || (normCity(n) !== n.replace(/^./, (x) => x.toUpperCase()) && cityNeedles(normCity(n)).some((cn) => hay.includes(cn)))));
    });
  }
  if (nearSea) list = list.filter((u) => COAST.has(u.building?.district || ""));

  // Комнаты: точное совпадение; если таких мало — добираем объекты, где комнаты не указаны (помечены).
  const relaxed = [];
  if (rooms != null && !Number.isNaN(rooms)) {
    const exact = list.filter((u) => (rooms === 0 ? u.type === "Студия" : rooms >= 4 ? u.rooms >= 4 : u.type !== "Студия" && u.rooms === rooms));
    if (exact.length >= 3 || rooms === 0) list = exact;
    else {
      const unknown = list.filter((u) => !u.rooms && u.type !== "Студия" && (!u.area || (u.area >= 25 + rooms * 15)));
      if (unknown.length) relaxed.push("rooms_unknown_included");
      list = [...exact, ...unknown];
    }
  }
  return { list, relaxed };
}

/**
 * Если строгий поиск дал 0 — ищем шире, по шагам, пока не найдётся (тест Мозга 18.11 03:41,
 * правило «прежде чем сказать "нет", повторить поиск шире и назвать ближайшее»):
 *   district → площадь/этаж → комнаты → тип (офис ↔ коммерция уже вместе) → «у моря» → пригород → ближайший город
 *   → бюджет +30% → бюджет без потолка (ближайшие по цене).
 * Сделку (аренда/покупка/посуточно) не меняем никогда.
 */
function widenSteps(q) {
  const steps = [];
  let cur = { ...q, a: { ...q.a } };
  const push = (code, mut) => { cur = { ...cur, a: { ...cur.a } }; mut(cur); steps.push({ code, q: cur }); };
  if (cur.district) push("district_dropped", (c) => { c.district = ""; });
  const near = [...new Set(cur.cities.map((c) => NEAR_CITY[c]).filter(Boolean))];
  if (near.length) push("nearby_city:" + near.join(","), (c) => { c.cities = [...new Set([...c.cities, ...near])]; });
  if (cur.a.area_min || cur.a.area_max || cur.a.floor_min || cur.a.floor_max) push("area_floor_dropped", (c) => { c.a.area_min = c.a.area_max = c.a.floor_min = c.a.floor_max = 0; });
  if (cur.ppmMin || cur.ppmMax) push("price_per_m2_dropped", (c) => { c.ppmMin = c.ppmMax = 0; });
  if (cur.rooms != null && !Number.isNaN(cur.rooms)) push("rooms_dropped", (c) => { c.rooms = null; });
  if (cur.bmax) push("budget_plus_30", (c) => { c.bmax = c.bmax * 1.3; });
  if (cur.type) push("type_dropped", (c) => { c.type = ""; });
  if (cur.nearSea) push("near_sea_dropped", (c) => { c.nearSea = false; });
  if (cur.bmax || cur.bmin) push("budget_dropped", (c) => { c.bmax = 0; c.bmin = 0; c.nearestTo = q.bmax || q.bmin; });
  if (cur.cities.length) push("city_dropped", (c) => { c.cities = []; });
  return steps;
}

export function searchUnits(units, args = {}, { rate = 2.7, lang = "ru", widen = true } = {}) {
  const a = args || {};
  const sortArg = String(a.sort || "").toLowerCase();
  const limit = Math.min(5, Math.max(1, parseInt(a.limit, 10) || 5));
  const cities = parseCities(a.city);
  const city = cities[0] || "";
  const deal = normDealArg(a.deal);
  const type = normType(a.type);
  const rooms = a.rooms != null && a.rooms !== "" ? parseInt(a.rooms, 10) : null;
  const toUsd = (x) => { const n = Number(x) || 0; return String(a.currency || "").toUpperCase() === "GEL" ? n / rate : n; };
  const bmax = toUsd(a.budget_max), bmin = toUsd(a.budget_min);
  let district = String(a.district || "").trim().toLowerCase();
  // В районе указан пригород («Махинджаури», «Гонио»): в базе это отдельный город — ищем по городу.
  const dWords = district.split(/[\s\/,;|]+/).filter(Boolean);
  const dTowns = dWords.map(knownTown).filter(Boolean);
  if (dTowns.length) {
    // город-«родитель» (Батуми для Махинджаури/Гонио) убираем: он вернётся только при поиске шире
    for (let i = cities.length - 1; i >= 0; i--) if (dTowns.some((t) => NEAR_CITY[t] === cities[i])) cities.splice(i, 1);
    dTowns.forEach((t) => { if (!cities.includes(t)) cities.push(t); });
    district = dWords.filter((w) => !knownTown(w) && !/^(или|и|or|and|ve|veya|ან|და)$/i.test(w)).join(" ");
  }
  const nearSea = a.near_sea === true || a.near_sea === "true";
  const ppmMax = Number(a.price_per_m2_max) || 0, ppmMin = Number(a.price_per_m2_min) || 0;
  const byPpm = (ppmMax > 0 || ppmMin > 0) && sortArg !== "price_asc" && sortArg !== "price_desc" || sortArg === "ppm_asc";
  const sort = SORTS.has(sortArg) ? sortArg : (byPpm ? "ppm_asc" : "");

  const q0 = { cities, deal, type, rooms, bmin, bmax, district, nearSea, ppmMin, ppmMax, a: { ...a }, nearestTo: 0 };
  let { list, relaxed } = filterUnits(units, q0, rate);
  const exactTotal = list.length;
  let used = q0;
  const widened = [];
  if (widen && !list.length && (Array.isArray(units) && units.length)) {
    for (const st of widenSteps(q0)) {
      widened.push(st.code);
      const r = filterUnits(units, st.q, rate);
      if (r.list.length) { list = r.list; relaxed = r.relaxed; used = st.q; break; }
    }
    if (!list.length) widened.length = 0; // по этой сделке на сайте вообще ничего нет
  }

  // Ранжирование: при фильтре по цене за м² — от меньшей цены за м²; иначе у моря (если просили) → продвигаемые → новее.
  // При поиске шире по бюджету — ближайшие к бюджету клиента; офис при запросе офиса — выше коммерции.
  const wantOffice = type === "office";
  const near = used.nearestTo || 0;
  const ranked = [...list].sort((x, y) =>
    (near ? Math.abs((priceUsd(x, rate) || 1e12) - near) - Math.abs((priceUsd(y, rate) || 1e12) - near) : 0) ||
    (wantOffice ? (unitCat(y.type) === "office") - (unitCat(x.type) === "office") : 0) ||
    (used.cities.length > 1 && cities.length ? (cities.includes(y.building?.district) ? 1 : 0) - (cities.includes(x.building?.district) ? 1 : 0) : 0) ||
    (byPpm ? (ppmUsd(x, rate) || Infinity) - (ppmUsd(y, rate) || Infinity) : 0) ||
    (sort === "price_asc" ? (priceUsd(x, rate) || Infinity) - (priceUsd(y, rate) || Infinity) : 0) ||
    (sort === "price_desc" ? (priceUsd(y, rate) || 0) - (priceUsd(x, rate) || 0) : 0) ||
    (sort === "newest" ? String(y.created_at || "").localeCompare(String(x.created_at || "")) : 0) ||
    (nearSea ? seaScore(y) - seaScore(x) : 0) ||
    ((y.boost || 0) - (x.boost || 0)) ||
    String(y.created_at || "").localeCompare(String(x.created_at || "")));

  const linkCity = used.cities.length === 1 ? used.cities[0] : (used.cities.includes(city) && SUBURBS.has(city) && used.cities.length > 1 ? used.cities.find((c) => !SUBURBS.has(c)) || city : city);
  const link = catalogLink({ deal, city: linkCity, type: used.type === "office" ? "commercial" : used.type, rooms: used.rooms, a: used.a, bmin: used.bmin, bmax: used.bmax, ppm: byPpm && (used.ppmMin || used.ppmMax), sort });
  const items = ranked.slice(0, limit).map((u) => toCard(u, rate, lang));
  const res = { total: list.length, shown: items.length, sort: sort || "recommended", items, relaxed, catalog_url: link.url, catalog_exact: link.exact && !relaxed.length && !widened.length && !["office", "commercial"].includes(used.type) && cities.length <= 1 && !dTowns.length };
  if (widened.length) {
    // Точно под запрос 0. Показаны ближайшие варианты, total — число вариантов после расширения.
    res.exact_total = exactTotal;
    res.widened = widened;
    res.note = "Точно под все условия вариантов нет (exact_total=0). Показаны ближайшие: ослаблены условия из widened. Скажи клиенту, что именно ослаблено, и покажи эти варианты. Не говори, что вариантов нет.";
  }
  return res;
}
