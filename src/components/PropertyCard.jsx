"use client";
import Link from "next/link";
import Image from "next/image";
import { DEAL_CLASS, fmtMoney, perSuffix } from "@/data/data";
import FavButton from "@/components/FavButton";
import { useLang } from "@/components/LangContext";
import { typeLabel, cityLabel, translitAddress } from "@/lib/dict";

export default function PropertyCard({ unit }) {
  const { t, lang } = useLang();
  const b = unit.building;
  const rs = t("rooms_short");
  const ty = typeLabel(lang, unit.type);
  const district = cityLabel(lang, b.district || "Батуми");
  const bname = b["name_" + lang] || translitAddress(b.name, lang, b.kind);
  const photos = unit.photos && unit.photos.length > 1 ? unit.photos : null;
  const alt = `${ty}, ${unit.area} м² — ${bname}`;
  const fav = { slug: unit.slug, href: `/property/${unit.slug}`, title: `${ty}${unit.rooms ? `, ${unit.rooms} ${rs}` : ""}, ${unit.area} м²`, sub: `📍 ${district} · ${bname}`, price: unit.price, img: unit.img };
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
        <span className={"badge " + DEAL_CLASS[unit.deal]}>{t("deal_" + unit.deal)}</span>
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
              ? <><span className="bx-price" data-num={unit.perM2} data-cur={unit.currency}>{fmtMoney(unit.perM2, unit.currency)}</span> {t("per_m2")}</>
              : unit.per}
          </span>
        </div>
        <div className="ctitle">{ty}{unit.rooms ? `, ${unit.rooms} ${rs}` : ""}, {unit.area} м²</div>
        <div className="cdistrict">📍 {district}{b.district && bname ? " · " : ""}{bname}</div>
        <div className="meta">
          {unit.rooms ? <span>🛏 {unit.rooms} {rs}</span> : null}
          <span>📐 {unit.area} м²</span><span>🏢 {unit.floor}</span>
        </div>
      </div>
    </Link>
  );
}
