// Чат-подборщик (T-20261118-02 fix7): поиск по разделу «Новостройки» (/novostroyki, таблица complexes).
// Тест Мозга 18.11 04:05: «Новостройки в Батуми с рассрочкой» → Hanna ответила «новостроек нет»,
// хотя в разделе опубликованы ЖК (с рассрочкой). Чистая функция: на вход опубликованные ЖК
// (getPublishedComplexes(): без служебных полей), на выход короткие карточки со ссылкой /novostroyki/<slug>.
// price_from в базе — цена за м² (на сайте «от $N/м²»), unitMinPrice — самая дешёвая доступная планировка.
import { normCity, parseMoney } from "./search.js";

const SEA_NEAR_M = 500;
const L = {
  ru: { from: "от", m2: "м²", inst: (n) => `рассрочка до ${n} мес.`, done: "сдан", q: (q, y) => `сдача ${q} кв. ${y}`, sea: (m) => `${m} м до моря`, unit: "квартиры от" },
  en: { from: "from", m2: "m²", inst: (n) => `installments up to ${n} months`, done: "completed", q: (q, y) => `completion Q${q} ${y}`, sea: (m) => `${m} m to the sea`, unit: "units from" },
  ka: { from: "დან", m2: "მ²", inst: (n) => `განვადება ${n} თვემდე`, done: "დასრულებული", q: (q, y) => `ჩაბარება ${y}, ${q} კვ.`, sea: (m) => `ზღვამდე ${m} მ`, unit: "ბინები" },
};
const CITY_L = { en: { "Батуми": "Batumi", "Тбилиси": "Tbilisi", "Кобулети": "Kobuleti" }, ka: { "Батуми": "ბათუმი", "Тбилиси": "თბილისი", "Кобулети": "ქობულეთი" } };
const money = (n) => "$" + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

function card(c, lang) {
  const l = L[lang] || L.ru;
  const ppm = num(c.price_from), minUnit = num(c.unitMinPrice);
  const facts = [];
  if (ppm) facts.push(lang === "ka" ? `${money(ppm)}/${l.m2}-${l.from}` : `${l.from} ${money(ppm)}/${l.m2}`);
  if (minUnit) facts.push(lang === "ka" ? `${l.unit} ${money(minUnit)}-${l.from}` : `${l.unit} ${money(minUnit)}`);
  if (num(c.installment_months)) facts.push(l.inst(num(c.installment_months)));
  if (c.completed) facts.push(l.done); else if (num(c.completion_year)) facts.push(l.q(num(c.completion_q) || "?", num(c.completion_year)));
  if (c.sea_distance_m != null && Number(c.sea_distance_m) >= 0) facts.push(l.sea(Number(c.sea_distance_m)));
  return {
    name: c.name,
    city: lang === "ru" ? c.city : ((CITY_L[lang] || {})[c.city] || c.city),
    district: c.district || "",
    price_per_m2_from: ppm || null,
    unit_price_from: minUnit || null,
    installment_months: num(c.installment_months) || 0,
    facts: facts.join(", "),
    url: `/novostroyki/${c.slug}`,
  };
}

/**
 * args: { city, district, budget_max (полная цена квартиры, USD), price_per_m2_max, installment, near_sea, completed, sort: price_asc|price_desc }
 * Возвращает { total, shown, items, catalog_url, widened? }.
 */
export function searchComplexes(list, args = {}, { lang = "ru" } = {}) {
  const a = args || {};
  const all = Array.isArray(list) ? list : [];
  const q = {
    city: a.city ? normCity(String(a.city).split(/[\/,]/)[0]) : "",
    district: String(a.district || "").trim().toLowerCase(),
    bmax: parseMoney(a.budget_max),
    ppmMax: parseMoney(a.price_per_m2_max),
    inst: a.installment === true || a.installment === "true",
    sea: a.near_sea === true || a.near_sea === "true",
    done: a.completed === true || a.completed === "true",
  };
  const run = (f) => all.filter((c) => {
    if (f.city && c.city !== f.city) return false;
    if (f.district && ![c.name, c.district, c.address].filter(Boolean).join(" ").toLowerCase().includes(f.district)) return false;
    if (f.inst && !(num(c.installment_months) > 0)) return false;
    if (f.sea && !(c.sea_distance_m != null && Number(c.sea_distance_m) <= SEA_NEAR_M)) return false;
    if (f.done && !c.completed) return false;
    if (f.ppmMax && !(num(c.price_from) && num(c.price_from) <= f.ppmMax)) return false;
    if (f.bmax) {
      const est = num(c.unitMinPrice) || (num(c.price_from) * num(c.area_from));
      if (!(est && est <= f.bmax)) return false;
    }
    return true;
  });
  let found = run(q);
  const widened = [];
  if (!found.length && all.length) {
    for (const [code, key] of [["district_dropped", "district"], ["sea_dropped", "sea"], ["completed_dropped", "done"], ["price_per_m2_dropped", "ppmMax"], ["budget_dropped", "bmax"], ["installment_dropped", "inst"]]) {
      if (!q[key]) continue;
      q[key] = key === "district" ? "" : key === "ppmMax" || key === "bmax" ? 0 : false;
      widened.push(code);
      found = run(q);
      if (found.length) break;
    }
    if (!found.length) widened.length = 0;
  }
  const sort = String(a.sort || "");
  const ranked = [...found].sort((x, y) =>
    (sort === "price_asc" ? (num(x.price_from) || 1e9) - (num(y.price_from) || 1e9) : 0) ||
    (sort === "price_desc" ? num(y.price_from) - num(x.price_from) : 0) ||
    ((y.featured ? 1 : 0) - (x.featured ? 1 : 0)) || ((y.sort_weight || 0) - (x.sort_weight || 0)));
  const items = ranked.slice(0, 5).map((c) => card(c, lang));
  const p = new URLSearchParams();
  if (q.city) p.set("city", q.city);
  if (q.inst) p.set("installment", "1");
  if (q.sea) p.set("sea", "1");
  if (sort === "price_asc" || sort === "price_desc") p.set("sort", sort);
  const res = { total: found.length, shown: items.length, items, catalog_url: "/novostroyki" + (p.toString() ? "?" + p : "") };
  if (widened.length) { res.exact_total = 0; res.widened = widened; }
  return res;
}
