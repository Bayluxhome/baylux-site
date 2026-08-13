import Link from "next/link";
import MapView from "@/components/MapView";
import { buildingPriceFrom } from "@/data/data";
import { getBuildingsList } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Заголовок страницы зависит от языка посетителя (getLang читает cookies/headers) —
// ISR здесь несовместим, как и на страницах объекта/дома.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = getLang();
  return { title: tr(lang, "meta_map_t"), description: tr(lang, "meta_map_d") };
}

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
