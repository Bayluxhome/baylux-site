import Link from "next/link";
import MapView from "@/components/MapView";
import PropertyCard from "@/components/PropertyCard";
import { DEAL_LABEL } from "@/data/data";
import { getAllUnits } from "@/data/source";

export const revalidate = 300;

export const metadata = {
  title: "Каталог недвижимости в Батуми",
  description: "Квартиры, дома, новостройки и коммерция в Батуми — продажа, аренда и посуточно. Фильтры и карта.",
};

const DEAL_CHIPS = [
  { key: "", label: "Все сделки" },
  { key: "sale", label: "Продажа" },
  { key: "rent", label: "Аренда" },
  { key: "daily", label: "Посуточно" },
];

export default async function CatalogPage({ searchParams }) {
  const sp = searchParams || {};
  const deal = sp.deal || "";
  const type = sp.type || "";
  const district = sp.district || "";

  let units = await getAllUnits();
  if (deal) units = units.filter((u) => u.deal === deal);
  if (type === "new") units = units.filter((u) => u.type === "Новостройка");
  else if (type) units = units.filter((u) => u.type === type);
  if (district) units = units.filter((u) => u.building.district === district);

  const bmap = new Map();
  for (const u of units) {
    const b = u.building;
    if (!bmap.has(b.slug)) {
      bmap.set(b.slug, { slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng, priceFrom: u.price, units: [] });
    }
    bmap.get(b.slug).units.push({ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per });
  }
  const mapBuildings = Array.from(bmap.values());

  const qs = (k, v) => {
    const p = new URLSearchParams(sp); if (v) p.set(k, v); else p.delete(k);
    const s = p.toString(); return "/catalog" + (s ? "?" + s : "");
  };

  return (
    <div className="wrap" style={{ paddingTop: 22, paddingBottom: 40 }}>
      <div className="sec-head">
        <div>
          <h2>Недвижимость в Батуми{deal ? ` — ${DEAL_LABEL[deal].toLowerCase()}` : ""}</h2>
          <p>Найдено {units.length} объект(ов){type === "new" ? " · новостройки" : ""}{district ? ` · ${district}` : ""}</p>
        </div>
      </div>

      <div className="filterbar">
        {DEAL_CHIPS.map((c) => (
          <Link key={c.key} href={qs("deal", c.key)} className={"chip" + (deal === c.key ? " active" : "")}>{c.label}</Link>
        ))}
        <Link href={qs("type", type === "new" ? "" : "new")} className={"chip" + (type === "new" ? " active" : "")}>Новостройки</Link>
        <Link href={qs("district", district === "Новый бульвар" ? "" : "Новый бульвар")} className={"chip" + (district === "Новый бульвар" ? " active" : "")}>Новый бульвар</Link>
        <Link href={qs("district", district === "Старый Батуми" ? "" : "Старый Батуми")} className={"chip" + (district === "Старый Батуми" ? " active" : "")}>Старый Батуми</Link>
      </div>

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
