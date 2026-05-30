import Link from "next/link";
import { buildingPriceFrom, buildingDealsSummary } from "@/data/data";

export default function BuildingCard({ building }) {
  return (
    <Link className="card" href={`/building/${building.slug}`}>
      <div className="ph" style={{ backgroundImage: `url('${building.image}')` }}>
        <span className="badge b-jk">{building.kind === "complex" ? "ЖК" : "Дом"}</span>
      </div>
      <div className="body">
        <div className="price">от {buildingPriceFrom(building)}</div>
        <div className="ctitle">{building.name}</div>
        <div className="cdistrict">📍 Батуми · {building.district}{building.developer ? ` · ${building.developer}` : ""}</div>
        <span className="unit-tag">{building.units.length} объект(ов) · {buildingDealsSummary(building)}</span>
      </div>
    </Link>
  );
}
