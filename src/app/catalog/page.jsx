import Link from "next/link";
import MapView from "@/components/MapView";
import PropertyCard from "@/components/PropertyCard";
import { DEAL_LABEL, CAT_LABEL, GE_CITIES, unitCat, unitIsNew } from "@/data/data";
import { getAllUnits } from "@/data/source";

export const revalidate = 300;

export const metadata = {
  title: "Каталог недвижимости в Батуми и Грузии",
  description: "Квартиры, дома, новостройки и коммерция — продажа, аренда и посуточно. Фильтры по городу, цене, комнатам, площади и удобствам.",
};

const DEAL_CHIPS = [
  { key: "", label: "Все" },
  { key: "sale", label: "Продажа" },
  { key: "rent", label: "Аренда" },
  { key: "daily", label: "Посуточно" },
];
const AMENITIES = ["Мебель", "Балкон", "Терраса", "Парковка", "Ремонт «евро»", "Кондиционер", "Лифт"];
const priceVal = (u) => u.priceNum || (parseInt(String(u.price || "").replace(/[^\d]/g, ""), 10) || 0);

export default async function CatalogPage({ searchParams }) {
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
  const amenSel = [].concat(sp.amen || []).filter(Boolean);

  let units = await getAllUnits();
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
  if (amenSel.length) units = units.filter((u) => amenSel.every((a) => (u.amenities || []).includes(a)));

  const bmap = new Map();
  for (const u of units) {
    const b = u.building;
    if (!bmap.has(b.slug)) bmap.set(b.slug, { slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [] });
    bmap.get(b.slug).units.push({ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per });
  }
  const mapBuildings = Array.from(bmap.values());

  const qs = (k, v) => {
    const p = new URLSearchParams();
    for (const [key, val] of Object.entries(sp)) { if (Array.isArray(val)) val.forEach((x) => p.append(key, x)); else if (val != null) p.set(key, val); }
    if (v) p.set(k, v); else p.delete(k);
    const s = p.toString(); return "/catalog" + (s ? "?" + s : "");
  };

  return (
    <div className="wrap" style={{ paddingTop: 22, paddingBottom: 40 }}>
      <div className="sec-head">
        <div>
          <h2>Недвижимость{deal ? ` — ${DEAL_LABEL[deal].toLowerCase()}` : ""}{cat && CAT_LABEL[cat] ? ` · ${CAT_LABEL[cat].toLowerCase()}` : ""}</h2>
          <p>Найдено {units.length} объект(ов){isNew ? " · новостройки" : ""}{city ? ` · ${city}` : ""}</p>
        </div>
      </div>

      <div className="filterbar">
        {DEAL_CHIPS.map((c) => (
          <Link key={c.key} href={qs("deal", c.key)} className={"chip" + (deal === c.key ? " active" : "")}>{c.label}</Link>
        ))}
        <Link href={qs("new", isNew ? "" : "1")} className={"chip" + (isNew ? " active" : "")}>Новостройки</Link>
      </div>

      <form className="cat-filters" action="/catalog" method="get">
        <input type="hidden" name="deal" value={deal} />
        {isNew && <input type="hidden" name="new" value="1" />}
        <div className="cf-grid">
          <label>Город
            <select name="city" defaultValue={city}><option value="">Любой город</option>{GE_CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>
          </label>
          <label>Тип
            <select name="cat" defaultValue={cat}><option value="">Любой тип</option>{Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          </label>
          <label>Комнат
            <select name="rooms" defaultValue={rooms}><option value="">Любая</option><option value="0">Студия</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select>
          </label>
          <label>Год от
            <input name="ymin" defaultValue={ymin || ""} inputMode="numeric" placeholder="2018" />
          </label>
          <label>Цена от, $
            <input name="pmin" defaultValue={pmin || ""} inputMode="numeric" placeholder="0" />
          </label>
          <label>Цена до, $
            <input name="pmax" defaultValue={pmax || ""} inputMode="numeric" placeholder="150000" />
          </label>
          <label>Площадь от, м²
            <input name="amin" defaultValue={amin || ""} inputMode="numeric" placeholder="0" />
          </label>
          <label>Площадь до, м²
            <input name="amax" defaultValue={amax || ""} inputMode="numeric" placeholder="200" />
          </label>
        </div>
        <div className="cf-amen">
          {AMENITIES.map((a) => (
            <label key={a} className="cf-check"><input type="checkbox" name="amen" value={a} defaultChecked={amenSel.includes(a)} />{a}</label>
          ))}
          <label className="cf-check"><input type="checkbox" name="nc" value="1" defaultChecked={nc} />Без комиссии</label>
        </div>
        <div className="cf-actions">
          <button className="btn btn-gold" type="submit">Показать объекты</button>
          <Link className="btn btn-ghost" href="/catalog">Сбросить</Link>
        </div>
      </form>

      {units.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", padding: "30px 0" }}>По этому фильтру пока нет объектов. <Link href="/catalog" style={{ color: "var(--navy)", fontWeight: 600 }}>Сбросить фильтры</Link></p>
      ) : (
        <div className="split">
          <div className="cards">
            {units.map((u) => <PropertyCard key={u.id} unit={u} />)}
          </div>
          <MapView buildings={mapBuildings} className="map-full" />
        </div>
      )}
    </div>
  );
}
