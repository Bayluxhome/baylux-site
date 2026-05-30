import Link from "next/link";
import Image from "next/image";
import { DEAL_LABEL, DEAL_CLASS } from "@/data/data";

export default function PropertyCard({ unit }) {
  const b = unit.building;
  return (
    <Link className="card" href={`/property/${unit.slug}`}>
      <div className="ph">
        <Image src={unit.img} alt={`${unit.type}, ${unit.area} м² — ${b.name}`} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
        <span className={"badge " + DEAL_CLASS[unit.deal]}>{DEAL_LABEL[unit.deal]}</span>
      </div>
      <div className="body">
        <div className="price">{unit.price} <span className="perm">{unit.per}</span></div>
        <div className="ctitle">{unit.type}{unit.rooms ? `, ${unit.rooms} комн.` : ""}, {unit.area} м²</div>
        <div className="cdistrict">📍 Батуми · {b.district} · {b.name}</div>
        <div className="meta">
          {unit.rooms ? <span>🛏 {unit.rooms} комн.</span> : null}
          <span>📐 {unit.area} м²</span><span>🏢 {unit.floor}</span>
        </div>
      </div>
    </Link>
  );
}
