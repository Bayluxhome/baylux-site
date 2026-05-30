// Baylux — локальные данные (на старте). Позже заменяется на Sanity CMS.
// Модель: BUILDING (дом/ЖК) содержит UNITS (квартиры/лоты). Частный объект = дом с одним лотом.

export const CITY = { slug: "batumi", name: "Батуми", country: "Грузия" };

export const GE_CITIES = [
  { name: "Батуми", count: 268, active: true },
  { name: "Тбилиси", count: 550 },
  { name: "Кобулети", count: 26 },
  { name: "Гонио", count: 21 },
  { name: "Чакви", count: 20 },
  { name: "Кутаиси", count: 37 },
  { name: "Рустави", count: 46 },
  { name: "Бакуриани", count: 11 },
  { name: "Гудаури", count: 12 },
  { name: "Местиа", count: 5 },
];

export const DEAL_LABEL = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
export const DEAL_CLASS = { sale: "b-sale", rent: "b-rent", daily: "b-daily" };

// Категории недвижимости (тип объекта) — для фильтров меню/каталога.
export const CAT_LABEL = {
  apartment: "Квартиры", house: "Дома", commercial: "Коммерция",
  office: "Офисы", warehouse: "Склады", land: "Участки", garage: "Гаражи и паркинги",
};
// Сопоставляем «человеческий» тип объекта с категорией фильтра.
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
// Новостройка: явный флаг из таблицы (isNew) или по типу «Новостройка».
export function unitIsNew(u) {
  return u.isNew === true || /новострой/i.test(u.type || "");
}

function img(seed) { return "/placeholder-baylux.jpg"; }

// type: "complex" — ЖК/новостройка с множеством квартир; "house" — частный объект (1 лот)
export const BUILDINGS = [
  {
    slug: "orbi-city",
    kind: "complex",
    name: "ЖК Orbi City",
    district: "Аэропорт",
    developer: "Orbi Group",
    yearBuilt: 2021,
    lat: 41.6190, lng: 41.6190,
    image: img("orbicity"),
    about:
      "Один из самых известных апарт-комплексов Батуми у моря. Развитая инфраструктура, бассейны, рестораны и сервис уровня апарт-отеля. Подходит и для жизни, и для сдачи гостям.",
    units: [
      { id: "oc-1", slug: "orbi-city-studio-420", deal: "rent",  type: "Студия",   rooms: 1, area: 34, floor: "18/30", price: "$420 / мес", per: "меблирована" },
      { id: "oc-2", slug: "orbi-city-1k-74000",   deal: "sale",  type: "Квартира", rooms: 1, area: 45, floor: "10/22", price: "$74 000",   per: "$1 640 / м²" },
      { id: "oc-3", slug: "orbi-city-studio-38",   deal: "daily", type: "Студия",   rooms: 1, area: 28, floor: "9/16",  price: "$38 / ночь", per: "для гостей" },
      { id: "oc-4", slug: "orbi-city-2k-95000",    deal: "sale",  type: "Квартира", rooms: 2, area: 56, floor: "14/30", price: "$95 000",   per: "$1 700 / м²" },
    ],
  },
  {
    slug: "marine-residence",
    kind: "complex",
    name: "ЖК Marine Residence",
    district: "Новый бульвар",
    developer: "Marine Development",
    yearBuilt: 2025,
    lat: 41.6480, lng: 41.6320,
    image: img("marine"),
    about:
      "Новостройка у нового бульвара. Сдача 2025, квартиры от застройщика с видом на море. Хорошая точка входа для инвестиции с рассрочкой.",
    units: [
      { id: "mr-1", slug: "marine-1k-52900", deal: "sale", type: "Новостройка", rooms: 1, area: 42, floor: "8/20",  price: "от $52 900", per: "$1 180 / м²" },
      { id: "mr-2", slug: "marine-2k-78000", deal: "sale", type: "Новостройка", rooms: 2, area: 60, floor: "12/24", price: "$118 000",  per: "$1 950 / м²" },
      { id: "mr-3", slug: "marine-comm-210", deal: "sale", type: "Коммерция",   rooms: 0, area: 100, floor: "1/20",  price: "$210 000",  per: "$2 100 / м²" },
    ],
  },
  {
    slug: "old-batumi-house",
    kind: "house",
    name: "Дом в Старом Батуми",
    district: "Старый Батуми",
    yearBuilt: 2010,
    lat: 41.6450, lng: 41.6420,
    image: img("oldbatumi"),
    about:
      "Квартиры в историческом центре Батуми — рядом площадь Пьяцца, набережная и рестораны. Атмосфера старого города плюс инфраструктура у моря.",
    units: [
      { id: "ob-1", slug: "old-batumi-3k-145000", deal: "sale", type: "Квартира", rooms: 3, area: 83, floor: "5/9", price: "$145 000", per: "$1 740 / м²" },
      { id: "ob-2", slug: "old-batumi-2k-650",    deal: "rent", type: "Квартира", rooms: 2, area: 58, floor: "6/8", price: "$650 / мес", per: "долгосрок" },
    ],
  },
  {
    slug: "gonio-villa",
    kind: "house",
    name: "Дом с садом в Гонио",
    district: "Гонио",
    yearBuilt: 2019,
    lat: 41.5720, lng: 41.5710,
    image: img("gonio"),
    about:
      "Частный дом с двором и садом в тихом Гонио, в нескольких минутах от пляжа. Подходит для семьи или под загородную аренду.",
    units: [
      { id: "gv-1", slug: "gonio-house-900", deal: "rent", type: "Дом", rooms: 4, area: 140, floor: "2 эт.", price: "$900 / мес", per: "долгосрок" },
    ],
  },
];

// ---- helpers ----
export function allUnits() {
  return BUILDINGS.flatMap((b) =>
    b.units.map((u) => ({ ...u, building: b, img: b.image }))
  );
}
export function getBuilding(slug) {
  return BUILDINGS.find((b) => b.slug === slug) || null;
}
export function getUnit(slug) {
  for (const b of BUILDINGS) {
    const u = b.units.find((x) => x.slug === slug);
    if (u) return { ...u, building: b, img: b.image };
  }
  return null;
}
export function buildingPriceFrom(b) {
  const sale = b.units.filter((u) => u.deal === "sale");
  return sale.length ? sale[0].price : b.units[0].price;
}
export function buildingDealsSummary(b) {
  const counts = {};
  b.units.forEach((u) => { counts[u.deal] = (counts[u.deal] || 0) + 1; });
  return Object.entries(counts)
    .map(([d, n]) => `${DEAL_LABEL[d]}: ${n}`)
    .join(" · ");
}
