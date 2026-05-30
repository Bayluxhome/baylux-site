import Link from "next/link";
import Image from "next/image";
import { buildingPriceFrom, buildingDealsSummary } from "@/data/data";

export default function BuildingCard({ building }) {
  return (
    <Link className="card" href={`/building/${building.slug}`}>
      <div className="ph">
        <Image src={building.image} alt={building.name} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
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
