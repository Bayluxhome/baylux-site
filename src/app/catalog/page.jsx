import Link from "next/link";
import MapView from "@/components/MapView";
import PropertyCard from "@/components/PropertyCard";
import { DEAL_LABEL, CAT_LABEL, GE_CITIES, unitCat, unitIsNew } from "@/data/data";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr, cityLabel } from "@/lib/dict";

export const revalidate = 300;

export const metadata = {
  title: "Каталог недвижимости в Батуми и Грузии",
  description: "Квартиры, дома, новостройки и коммерция — продажа, аренда и посуточно. Фильтры по городу, цене, комнатам, площади и удобствам.",
  alternates: { canonical: "/catalog" },
};

const DEAL_CHIPS = [
  { key: "", lk: "chip_all" },
  { key: "sale", lk: "deal_sale" },
  { key: "rent", lk: "deal_rent" },
  { key: "daily", lk: "deal_daily" },
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
          <h2>{t("foot_realty")}{deal ? ` — ${t("deal_" + deal).toLowerCase()}` : ""}{cat && CAT_LABEL[cat] ? ` · ${CAT_LABEL[cat].toLowerCase()}` : ""}</h2>
          <p>{t("cat_found")} {units.length} {t("cat_objects")}{isNew ? ` · ${t("nav_new").toLowerCase()}` : ""}{city ? ` · ${city}` : ""}</p>
        </div>
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
            <label key={a} className="cf-check"><input type="checkbox" name="amen" value={a} defaultChecked={amenSel.includes(a)} />{a}</label>
          ))}
          <label className="cf-check"><input type="checkbox" name="nc" value="1" defaultChecked={nc} />{t("f_noCommission")}</label>
        </div>
        <div className="cf-actions">
          <button className="btn btn-gold" type="submit">{t("f_show")}</button>
          <Link className="btn btn-ghost" href="/catalog">{t("f_reset")}</Link>
        </div>
      </form>

      {units.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", padding: "30px 0" }}>{t("cat_empty")} <Link href="/catalog" style={{ color: "var(--navy)", fontWeight: 600 }}>{t("f_reset")}</Link></p>
      ) : (
        <div className="split">
          <div className="cards">
            {units.map((u) => <PropertyCard key={u.id} unit={u} />)}
          </div>
          <MapView buildings={mapBuildings} className="map-full" />
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
