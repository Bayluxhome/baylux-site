import Link from "next/link";
import MapView from "@/components/MapView";
import PropertyCard from "@/components/PropertyCard";
import { DEAL_LABEL, CAT_LABEL, GE_CITIES, unitCat, unitIsNew } from "@/data/data";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr, cityLabel, amenLabel } from "@/lib/dict";

export const revalidate = 300;

const PAGE_SIZE = 48;

export function generateMetadata({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const deal = searchParams?.deal || "";
  const isNew = searchParams?.new === "1" || searchParams?.type === "new";
  // Заголовки под частотные запросы (Wordstat): «купить квартиру», «снять квартиру», «посуточно».
  let title = "Купить квартиру в Батуми и Грузии — каталог недвижимости";
  let description = "Квартиры, апартаменты, дома и новостройки в Батуми и Грузии. Продажа, аренда и посуточно — фильтры по городу, цене, комнатам и удобствам.";
  if (isNew) {
    title = "Новостройки Батуми — квартиры от застройщиков";
    description = "Квартиры и апартаменты в новостройках Батуми от застройщиков. Цены, планировки и сроки сдачи — каталог Baylux.";
  } else if (deal === "rent") {
    title = "Снять квартиру в Батуми на длительный срок — аренда жилья";
    description = "Долгосрочная аренда квартир и апартаментов в Батуми у моря. Проверенные объекты и прозрачные цены — Baylux.";
  } else if (deal === "daily") {
    title = "Посуточная аренда квартир в Батуми — снять жильё посуточно";
    description = "Снять квартиру в Батуми посуточно — апартаменты у моря на короткий срок и помесячно. Каталог Baylux.";
  } else if (deal === "sale") {
    title = "Купить квартиру в Батуми и Грузии — апартаменты у моря";
    description = "Купить квартиру или апартаменты в Батуми и Грузии. Первичка и вторичка у моря — цены, фото, помощь местной команды Baylux.";
  }
  // Само-ссылающийся canonical: страница ?page=N указывает на саму себя (а не на page 1),
  // иначе Google схлопнул бы пагинацию в одну страницу и не проиндексировал бы глубокие объекты.
  const canonical = page > 1 ? `/catalog?page=${page}` : "/catalog";
  return {
    title,
    description,
    alternates: { canonical },
  };
}

const DEAL_CHIPS = [
  { key: "", lk: "chip_all" },
  { key: "sale", lk: "deal_sale" },
  { key: "rent", lk: "deal_rent" },
  { key: "daily", lk: "deal_daily" },
];
const SORTS = [
  { key: "rec", lk: "sort_rec" },
  { key: "new", lk: "sort_new" },
  { key: "price_asc", lk: "sort_price_asc" },
  { key: "price_desc", lk: "sort_price_desc" },
  { key: "area_asc", lk: "sort_area_asc" },
  { key: "area_desc", lk: "sort_area_desc" },
];
const AMENITIES = ["Мебель", "Балкон", "Терраса", "Парковка", "Ремонт «евро»", "Кондиционер", "Лифт"];
const priceVal = (u) => u.priceNum || (parseInt(String(u.price || "").replace(/[^\d]/g, ""), 10) || 0);

export default async function CatalogPage({ searchParams }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const sp = searchParams || {};
  const deal = sp.deal || "";
  const cat = sp.cat || "";
  const isNew = sp.new === "1" || sp.type === "new";
  const legacyType = sp.type && sp.type !== "new" ? sp.type : "";
  const city = sp.city || sp.district || "";
  const rooms = sp.rooms || "";
  const pmin = parseInt(sp.pmin, 10) || 0;
  const pmax = parseInt(sp.pmax, 10) || 0;
  const amin = parseInt(sp.amin, 10) || 0;
  const amax = parseInt(sp.amax, 10) || 0;
  const ymin = parseInt(sp.ymin, 10) || 0;
  const nc = sp.nc === "1";
  const managed = sp.managed === "1";
  const amenSel = [].concat(sp.amen || []).filter(Boolean);
  const sort = SORTS.some((s) => s.key === sp.sort) ? sp.sort : "rec";
  const q = (sp.q || "").toString().trim();

  let units = await getAllUnits();
  // Текстовый поиск по адресу/улице/дому/ЖК/району — все слова запроса должны встретиться.
  if (q) {
    const needles = q.toLowerCase().split(/\s+/).filter(Boolean);
    units = units.filter((u) => {
      const hay = [u.building?.name, u.building?.district, u.complex, u.type].filter(Boolean).join(" ").toLowerCase();
      return needles.every((n) => hay.includes(n));
    });
  }
  if (deal) units = units.filter((u) => u.deal === deal);
  if (deal === "daily") units = units.filter((u) => ["apartment", "house"].includes(unitCat(u.type)));
  if (isNew) units = units.filter((u) => unitIsNew(u));
  if (cat) units = units.filter((u) => unitCat(u.type) === cat);
  if (legacyType) units = units.filter((u) => u.type === legacyType);
  if (city) units = units.filter((u) => u.building.district === city);
  if (rooms) units = units.filter((u) => rooms === "4" ? u.rooms >= 4 : u.rooms === parseInt(rooms, 10));
  if (pmin) units = units.filter((u) => priceVal(u) >= pmin);
  if (pmax) units = units.filter((u) => { const v = priceVal(u); return v > 0 && v <= pmax; });
  if (amin) units = units.filter((u) => (u.area || 0) >= amin);
  if (amax) units = units.filter((u) => (u.area || 0) > 0 && u.area <= amax);
  if (ymin) units = units.filter((u) => u.year && parseInt(u.year, 10) >= ymin);
  if (nc) units = units.filter((u) => u.noCommission);
  if (managed) units = units.filter((u) => u.managed);
  if (amenSel.length) units = units.filter((u) => amenSel.every((a) => (u.amenities || []).includes(a)));

  // Сортировка. "rec" — порядок по умолчанию (boost desc из источника). Остальные — чистые,
  // без учёта boost. Пустые цены/площади уходят в конец при возрастании.
  if (sort === "new") units = [...units].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  else if (sort === "price_asc") units = [...units].sort((a, b) => (priceVal(a) || Infinity) - (priceVal(b) || Infinity));
  else if (sort === "price_desc") units = [...units].sort((a, b) => (priceVal(b) || 0) - (priceVal(a) || 0));
  else if (sort === "area_asc") units = [...units].sort((a, b) => (a.area || Infinity) - (b.area || Infinity));
  else if (sort === "area_desc") units = [...units].sort((a, b) => (b.area || 0) - (a.area || 0));

  // Пагинация: total — все отфильтрованные, на странице — срез по PAGE_SIZE.
  const total = units.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, parseInt(sp.page, 10) || 1));
  const pageUnits = units.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Карта показывает объекты ТЕКУЩЕЙ страницы (а не все) — чтобы не перегружать при росте каталога.
  const bmap = new Map();
  for (const u of pageUnits) {
    const b = u.building;
    if (!bmap.has(b.slug)) bmap.set(b.slug, { slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [] });
    bmap.get(b.slug).units.push({ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per, img: u.unit_image || (u.photos && u.photos[0]) || u.img || "" });
  }
  const mapBuildings = Array.from(bmap.values());

  // Центр карты: при выбранном городе — по центру его объектов (и подгоняем масштаб),
  // без выбора — Батуми по умолчанию (а не общий вид на весь Кавказ).
  let mapCenter = [41.642, 41.632]; // Батуми
  let mapZoom = 11;
  let fitMap = false;
  if (city) {
    const pts = mapBuildings.filter((b) => b.lat && b.lng);
    if (pts.length) {
      mapCenter = [pts.reduce((s, b) => s + b.lat, 0) / pts.length, pts.reduce((s, b) => s + b.lng, 0) / pts.length];
      mapZoom = 13;
      fitMap = pts.length > 1;
    }
  }

  const qs = (k, v) => {
    const p = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) { if (Array.isArray(val)) val.forEach((x) => p.append(key, x)); else if (val != null) p.set(key, val); }
    if (v) p.set(k, v); else p.delete(k);
    if (k !== "page") p.delete("page"); // смена любого фильтра/сортировки/поиска возвращает на 1-ю страницу
    const s = p.toString(); return "/catalog" + (s ? "?" + s : "");
  };

  // Скрытые поля для формы поиска/фильтров — переносят текущие параметры (кроме q/page, их задаёт сама форма).
  const hidden = (skip) => Object.entries(sp).flatMap(([k, v]) =>
    skip.includes(k) ? [] : (Array.isArray(v) ? v : [v]).map((val, i) => <input key={k + i} type="hidden" name={k} value={val} />));

  // Номера страниц с многоточием: 1 … (page-1) page (page+1) … last
  const pageNums = [];
  if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pageNums.push(i); }
  else {
    const add = (n) => { if (n >= 1 && n <= totalPages && !pageNums.includes(n)) pageNums.push(n); };
    add(1); add(2);
    for (let i = page - 1; i <= page + 1; i++) add(i);
    add(totalPages - 1); add(totalPages);
    pageNums.sort((a, b) => a - b);
  }

  const sortCur = SORTS.find((s) => s.key === sort) || SORTS[0];

  return (
    <div className="wrap" style={{ paddingTop: 22, paddingBottom: 40 }}>
      {/* Поиск по адресу/улице/дому/ЖК — переносит текущие фильтры через скрытые поля */}
      <form className="catsearch" action="/catalog" method="get">
        {hidden(["q", "page"])}
        <span className="catsearch-ic" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </span>
        <input name="q" defaultValue={q} placeholder={t("search_ph")} aria-label={t("search_ph")} />
        {q && <Link className="catsearch-clear" href={qs("q", "")} aria-label="clear">✕</Link>}
        <button className="btn btn-gold" type="submit">{t("search")}</button>
      </form>

      <div className="sec-head">
        <div>
          <h2>{t("foot_realty")}{deal ? ` — ${t("deal_" + deal).toLowerCase()}` : ""}{cat && CAT_LABEL[cat] ? ` · ${CAT_LABEL[cat].toLowerCase()}` : ""}</h2>
          <p>{t("cat_found")} {total} {t("cat_objects")}{q ? ` · «${q}»` : ""}{isNew ? ` · ${t("nav_new").toLowerCase()}` : ""}{city ? ` · ${city}` : ""}</p>
        </div>
        <details className="sortbox">
          <summary><span className="sort-cur">{t("sort_label")}: {t(sortCur.lk)}</span><span className="sort-caret">⌄</span></summary>
          <div className="sort-menu">
            {SORTS.map((s) => (
              <Link key={s.key} href={qs("sort", s.key === "rec" ? "" : s.key)} className={"sort-opt" + (s.key === sort ? " active" : "")}>{t(s.lk)}</Link>
            ))}
          </div>
        </details>
      </div>

      <div className="filterbar">
        {DEAL_CHIPS.map((c) => (
          <Link key={c.key} href={qs("deal", c.key)} className={"chip" + (deal === c.key ? " active" : "")}>{t(c.lk)}</Link>
        ))}
        <Link href={qs("new", isNew ? "" : "1")} className={"chip" + (isNew ? " active" : "")}>{t("nav_new")}</Link>
      </div>

      <form className="cat-filters" action="/catalog" method="get">
        <input type="hidden" name="deal" value={deal} />
        {isNew && <input type="hidden" name="new" value="1" />}
        {sort !== "rec" && <input type="hidden" name="sort" value={sort} />}
        {q && <input type="hidden" name="q" value={q} />}
        <div className="cf-grid">
          <label>{t("f_city")}
            <select name="city" defaultValue={city}><option value="">{t("f_anyCity")}</option>{GE_CITIES.map((c) => <option key={c.name} value={c.name}>{cityLabel(lang, c.name)}</option>)}</select>
          </label>
          <label>{t("f_type")}
            <select name="cat" defaultValue={cat}><option value="">{t("f_anyType")}</option>{(isNew ? ["apartment", "house", "commercial", "office", "garage"] : deal === "daily" ? ["apartment", "house"] : Object.keys(CAT_LABEL)).map((k) => <option key={k} value={k}>{t("cat_" + k)}</option>)}</select>
          </label>
          <label>{t("f_rooms")}
            <select name="rooms" defaultValue={rooms}><option value="">{t("f_anyRooms")}</option><option value="0">{t("f_studio")}</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select>
          </label>
          <label>{t("f_yearFrom")}
            <input name="ymin" defaultValue={ymin || ""} inputMode="numeric" placeholder="2018" />
          </label>
          <label>{t("f_priceFrom")}
            <input name="pmin" defaultValue={pmin || ""} inputMode="numeric" placeholder="0" />
          </label>
          <label>{t("f_priceTo")}
            <input name="pmax" defaultValue={pmax || ""} inputMode="numeric" placeholder="150000" />
          </label>
          <label>{t("f_areaFrom")}
            <input name="amin" defaultValue={amin || ""} inputMode="numeric" placeholder="0" />
          </label>
          <label>{t("f_areaTo")}
            <input name="amax" defaultValue={amax || ""} inputMode="numeric" placeholder="200" />
          </label>
        </div>
        <div className="cf-amen">
          {AMENITIES.map((a) => (
            <label key={a} className="cf-check"><input type="checkbox" name="amen" value={a} defaultChecked={amenSel.includes(a)} />{amenLabel(lang, a)}</label>
          ))}
          <label className="cf-check"><input type="checkbox" name="nc" value="1" defaultChecked={nc} />{t("f_noCommission")}</label>
        </div>
        <div className="cf-actions">
          <button className="btn btn-gold" type="submit">{t("f_show")}</button>
          <Link className="btn btn-ghost" href="/catalog">{t("f_reset")}</Link>
        </div>
      </form>

      {total === 0 ? (
        <p style={{ color: "var(--ink-soft)", padding: "30px 0" }}>{t("cat_empty")} <Link href="/catalog" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("f_reset")}</Link></p>
      ) : (
        <div className="split">
          <div>
            <div className="cards">
              {pageUnits.map((u) => <PropertyCard key={u.id} unit={u} />)}
            </div>
            {totalPages > 1 && (
              <nav className="pager" aria-label="Pagination">
                {page > 1 && <Link className="pg-arrow" href={qs("page", page - 1 > 1 ? String(page - 1) : "")} rel="prev" aria-label="prev">‹</Link>}
                {pageNums.map((n, i) => {
                  const gap = i > 0 && n - pageNums[i - 1] > 1;
                  return (
                    <span key={n} style={{ display: "contents" }}>
                      {gap && <span className="pg-dots">…</span>}
                      <Link className={"pg-num" + (n === page ? " active" : "")} href={qs("page", n > 1 ? String(n) : "")} aria-current={n === page ? "page" : undefined}>{n}</Link>
                    </span>
                  );
                })}
                {page < totalPages && <Link className="pg-arrow" href={qs("page", String(page + 1))} rel="next" aria-label="next">›</Link>}
              </nav>
            )}
          </div>
          <MapView buildings={mapBuildings} className="map-full" center={mapCenter} zoom={mapZoom} fit={fitMap} />
        </div>
      )}

      {Object.keys(sp).length === 0 && (
        <section style={{ paddingBlock: "34px 6px" }}>
          <h2 style={{ color: "var(--navy)", fontSize: 20, marginBottom: 10 }}>{t("seo_cat_h")}</h2>
          <p style={{ color: "var(--ink-soft)", lineHeight: 1.7, maxWidth: 820 }}>{t("seo_cat_p")}</p>
        </section>
      )}
    </div>
  );
}
