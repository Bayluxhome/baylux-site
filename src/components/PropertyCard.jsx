import Link from "next/link";
import Image from "next/image";
import { DEAL_LABEL, DEAL_CLASS, fmtMoney, perSuffix } from "@/data/data";
import FavButton from "@/components/FavButton";

export default function PropertyCard({ unit }) {
  const b = unit.building;
  const photos = unit.photos && unit.photos.length > 1 ? unit.photos : null;
  const alt = `${unit.type}, ${unit.area} м² — ${b.name}`;
  const fav = { slug: unit.slug, href: `/property/${unit.slug}`, title: `${unit.type}${unit.rooms ? `, ${unit.rooms} комн.` : ""}, ${unit.area} м²`, sub: `📍 ${b.district || "Батуми"} · ${b.name}`, price: unit.price, img: unit.img };
  return (
    <Link className="card" href={`/property/${unit.slug}`}>
      <div className="ph">
        {photos ? (
          <div className="ph-strip">
            {photos.map((p, i) => (
              <div className="ph-slide" key={i}>
                <Image src={p} alt={alt} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
              </div>
            ))}
          </div>
        ) : (
          <Image src={unit.img} alt={alt} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
        )}
        <span className={"badge " + DEAL_CLASS[unit.deal]}>{DEAL_LABEL[unit.deal]}</span>
        <FavButton item={fav} />
      </div>
      <div className="body">
        <div className="price">
          {unit.priceNum
            ? <><span className="bx-price" data-num={unit.priceNum} data-cur={unit.currency}>{fmtMoney(unit.priceNum, unit.currency)}</span>{perSuffix(unit.deal)}</>
            : unit.price}
          {" "}
          <span className="perm">
            {unit.deal === "sale" && unit.perM2
              ? <><span className="bx-price" data-num={unit.perM2} data-cur={unit.currency}>{fmtMoney(unit.perM2, unit.currency)}</span> за м²</>
              : unit.per}
          </span>
        </div>
        <div className="ctitle">{unit.type}{unit.rooms ? `, ${unit.rooms} комн.` : ""}, {unit.area} м²</div>
        <div className="cdistrict">📍 Батуми{b.district ? ` · ${b.district}` : ""} · {b.name}</div>
        <div className="meta">
          {unit.rooms ? <span>🛏 {unit.rooms} комн.</span> : null}
          <span>📐 {unit.area} м²</span><span>🏢 {unit.floor}</span>
        </div>
      </div>
    </Link>
  );
}
