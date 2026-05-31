import Link from "next/link";
import Image from "next/image";
import { buildingPriceFrom, buildingDealsSummary, buildingFromNum, fmtMoney } from "@/data/data";

export default function BuildingCard({ building }) {
  const from = buildingFromNum(building);
  return (
    <Link className="card" href={`/building/${building.slug}`}>
      <div className="ph">
        <Image src={building.image} alt={building.name} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
        <span className="badge b-jk">{building.kind === "complex" ? "ЖК" : "Дом"}</span>
      </div>
      <div className="body">
        <div className="price">от {from ? <span className="bx-price" data-num={from.n} data-cur={from.c}>{fmtMoney(from.n, from.c)}</span> : buildingPriceFrom(building)}</div>
        <div className="ctitle">{building.name}</div>
        <div className="cdistrict">📍 Батуми{building.district ? ` · ${building.district}` : ""}{building.developer ? ` · ${building.developer}` : ""}</div>
        <span className="unit-tag">{building.units.length} объект(ов) · {buildingDealsSummary(building)}</span>
      </div>
    </Link>
  );
}
