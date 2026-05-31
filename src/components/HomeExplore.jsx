"use client";
import { useState } from "react";
import MapView from "./MapView";
import BuildingCard from "./BuildingCard";
import PropertyCard from "./PropertyCard";
import { unitCat, unitIsNew, buildingPriceFrom } from "@/data/data";
import { useFilter } from "./FilterContext";

export default function HomeExplore({ buildings }) {
  const { f } = useFilter();
  const [sel, setSel] = useState(null);
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

  const selected = sel ? filtered.find((b) => b.slug === sel) : null;

  return (
    <div className="split">
      <div className="cards">
        {selected ? (
          <>
            <button type="button" className="btn btn-ghost" style={{ marginBottom: 2 }} onClick={() => setSel(null)}>← Все объекты ({filtered.length})</button>
            {selected.units.map((u) => <PropertyCard key={u.id || u.slug} unit={{ ...u, building: selected, img: u.unit_image || selected.image }} />)}
          </>
        ) : filtered.length ? (
          filtered.map((b) => <BuildingCard key={b.slug} building={b} />)
        ) : (
          <p style={{ color: "var(--ink-soft)", padding: "20px 0" }}>Нет объектов под выбранный фильтр. Измените параметры выше.</p>
        )}
      </div>
      <MapView buildings={mapBuildings} className="map-home" onSelect={setSel} />
    </div>
  );
}
