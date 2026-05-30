import Link from "next/link";
import MapView from "@/components/MapView";
import { buildingPriceFrom } from "@/data/data";
import { getBuildingsList } from "@/data/source";

export const revalidate = 300;

export const metadata = {
  title: "Карта объектов в Батуми",
  description: "Все объекты Baylux на карте Батуми — квартиры, дома, новостройки, продажа и аренда. Один пин — один дом.",
};

export default async function MapPage() {
  const BUILDINGS = await getBuildingsList();
  const mapBuildings = BUILDINGS.map((b) => ({
    slug: b.slug, name: b.name, district: b.district, kind: b.kind,
    lat: b.lat, lng: b.lng, priceFrom: buildingPriceFrom(b), units: b.units,
  }));
  const total = BUILDINGS.reduce((n, b) => n + b.units.length, 0);

  return (
    <div className="mapscreen">
      <div className="mapscreen-bar">
        <Link href="/catalog" className="btn btn-ghost" style={{ padding: "9px 16px" }}>← К списку</Link>
        <span className="ms-count">{total} объект(ов) на карте · Батуми</span>
        <Link href="/catalog" className="btn btn-gold" style={{ padding: "9px 18px", marginLeft: "auto" }}>Открыть каталог</Link>
      </div>
      <MapView buildings={mapBuildings} className="map-screen" zoom={12} />
    </div>
  );
}
