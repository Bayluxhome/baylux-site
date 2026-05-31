"use client";
import MapView from "./MapView";
import BuildingCard from "./BuildingCard";
import { unitCat, unitIsNew, buildingPriceFrom } from "@/data/data";
import { useFilter } from "./FilterContext";

export default function HomeExplore({ buildings }) {
  const { f } = useFilter();
  const isNew = f.tab === "new";
  const deal = isNew ? "" : f.tab;
  const pmax = parseInt(f.pmax, 10) || 0;

  const matchUnit = (u) => {
    if (deal && u.deal !== deal) return false;
    if (deal === "daily" && !["apartment", "house"].includes(unitCat(u.type))) return false;
    if (isNew && !unitIsNew(u)) return false;
    if (f.cat && unitCat(u.type) !== f.cat) return false;
    if (pmax && !(u.priceNum && u.priceNum <= pmax)) return false;
    return true;
  };

  const filtered = buildings
    .filter((b) => !f.city || b.district === f.city)
    .map((b) => ({ ...b, units: b.units.filter(matchUnit) }))
    .filter((b) => b.units.length > 0);

  const mapBuildings = filtered.map((b) => ({
    slug: b.slug, name: b.name, district: b.district, kind: b.kind, lat: b.lat, lng: b.lng,
    priceFrom: buildingPriceFrom(b),
    units: b.units.map((u) => ({ slug: u.slug, deal: u.deal, type: u.type, rooms: u.rooms, area: u.area, price: u.price, per: u.per })),
  }));

  return (
    <div className="split">
      <div className="cards">
        {filtered.length
          ? filtered.map((b) => <BuildingCard key={b.slug} building={b} />)
          : <p style={{ color: "var(--ink-soft)", padding: "20px 0" }}>Нет объектов под выбранный фильтр. Измените параметры выше.</p>}
      </div>
      <MapView buildings={mapBuildings} className="map-home" />
    </div>
  );
}
