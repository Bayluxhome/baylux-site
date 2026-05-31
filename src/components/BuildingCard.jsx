"use client";
import Link from "next/link";
import Image from "next/image";
import { buildingPriceFrom, buildingFromNum, fmtMoney } from "@/data/data";
import FavButton from "@/components/FavButton";
import { useLang } from "@/components/LangContext";

export default function BuildingCard({ building }) {
  const { t } = useLang();
  const from = buildingFromNum(building);
  const perM2 = from && from.deal === "sale" && from.area > 0 && from.n ? Math.round(from.n / from.area) : null;
  const counts = {};
  building.units.forEach((u) => { counts[u.deal] = (counts[u.deal] || 0) + 1; });
  const summary = Object.entries(counts).map(([d, n]) => `${t("deal_" + d)}: ${n}`).join(" · ");
  const fav = { slug: "b-" + building.slug, href: `/building/${building.slug}`, title: building.name, sub: `📍 ${building.district || "Батуми"}`, price: t("w_from") + " " + buildingPriceFrom(building), img: building.image };
  return (
    <Link className="card" href={`/building/${building.slug}`}>
      <div className="ph">
        <Image src={building.image} alt={building.name} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
        <span className="badge b-jk">{t(building.kind === "complex" ? "badge_jk" : "badge_house")}</span>
        <FavButton item={fav} />
      </div>
      <div className="body">
        <div className="price">{t("w_from")} {from ? <span className="bx-price" data-num={from.n} data-cur={from.c}>{fmtMoney(from.n, from.c)}</span> : buildingPriceFrom(building)}
          {perM2 ? <span className="perm"><span className="bx-price" data-num={perM2} data-cur={from.c}>{fmtMoney(perM2, from.c)}</span> {t("per_m2")}</span> : null}
        </div>
        <div className="ctitle">{building.name}</div>
        <div className="cdistrict">📍 {building.district || "Батуми"}{building.developer ? ` · ${building.developer}` : ""}</div>
        <span className="unit-tag">{building.units.length} {t("w_objects")} · {summary}</span>
      </div>
    </Link>
  );
}
