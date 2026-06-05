"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { buildingPriceFrom, buildingFromNum, fmtMoney } from "@/data/data";
import FavButton from "@/components/FavButton";
import { useLang } from "@/components/LangContext";
import { cityLabel, translitAddress, typeLabel } from "@/lib/dict";

export default function BuildingCard({ building }) {
  const { t, lang } = useLang();
  const stripRef = useRef(null);
  const [pidx, setPidx] = useState(0);
  const onStripScroll = () => {
    const el = stripRef.current;
    if (el && el.clientWidth) setPidx(Math.round(el.scrollLeft / el.clientWidth));
  };

  // Лента фото дома: фасад + фото объектов (как на странице дома), без повторов.
  const pool = [];
  const seen = new Set();
  const push = (p) => { if (p && !seen.has(p)) { seen.add(p); pool.push(p); } };
  push(building.image);
  for (const u of (building.units || [])) for (const p of (u.photos || [])) push(p);
  const photos = pool.length > 1 ? pool : null;

  const goStrip = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const el = stripRef.current;
    if (!el || !el.clientWidth || !photos) return;
    const target = Math.max(0, Math.min(photos.length - 1, pidx + dir));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };

  const district = cityLabel(lang, building.district || "Батуми");
  const bname = translitAddress(building["name_" + lang] || building.name, lang, building.kind);
  const from = buildingFromNum(building);
  const perM2 = from && from.deal === "sale" && from.area > 0 && from.n ? Math.round(from.n / from.area) : null;
  const counts = {};
  building.units.forEach((u) => { counts[u.deal] = (counts[u.deal] || 0) + 1; });
  const summary = Object.entries(counts).map(([d, n]) => `${t("deal_" + d)}: ${n}`).join(" · ");
  // Бейдж: ЖК/комплекс → «ЖК»; иначе реальный тип, если он один на весь дом; разные типы → общий «Дом».
  const types = [...new Set(building.units.map((u) => u.type).filter(Boolean))];
  const badge = building.kind === "complex"
    ? t("badge_jk")
    : types.length === 1 ? typeLabel(lang, types[0]) : t("badge_house");
  const fav = { slug: "b-" + building.slug, href: `/building/${building.slug}`, title: bname, sub: `📍 ${district}`, price: t("w_from") + " " + buildingPriceFrom(building), img: building.image };
  return (
    <Link className="card" href={`/building/${building.slug}`}>
      <div className="ph">
        {photos ? (
          <div className="ph-strip" ref={stripRef} onScroll={onStripScroll}>
            {photos.map((p, i) => (
              <div className="ph-slide" key={i}>
                <Image src={p} alt={bname} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
              </div>
            ))}
          </div>
        ) : (
          <Image src={building.image} alt={bname} fill sizes="(max-width:560px) 100vw, 360px" style={{ objectFit: "cover" }} />
        )}
        <span className="badge b-jk">{badge}</span>
        {photos && (photos.length <= 7
          ? <div className="ph-dots">{photos.map((_, i) => <span key={i} className={"ph-dot" + (i === pidx ? " on" : "")} />)}</div>
          : <div className="ph-count">{pidx + 1}/{photos.length}</div>)}
        {photos && (
          <>
            <button type="button" className="ph-arrow ph-prev" aria-label="Предыдущее фото" onClick={(e) => goStrip(e, -1)}>‹</button>
            <button type="button" className="ph-arrow ph-next" aria-label="Следующее фото" onClick={(e) => goStrip(e, 1)}>›</button>
          </>
        )}
        <FavButton item={fav} />
      </div>
      <div className="body">
        <div className="price">{t("w_from")} {from ? <span className="bx-price" data-num={from.n} data-cur={from.c}>{fmtMoney(from.n, from.c)}</span> : buildingPriceFrom(building)}
          {perM2 ? <>{" "}<span className="perm"><span className="bx-price" data-num={perM2} data-cur={from.c}>{fmtMoney(perM2, from.c)}</span> {t("per_m2")}</span></> : null}
        </div>
        <div className="ctitle">{bname}</div>
        <div className="cdistrict">📍 {district}{building.developer ? ` · ${building.developer}` : ""}</div>
        <span className="unit-tag">{building.units.length} {t("w_objects")} · {summary}</span>
      </div>
    </Link>
  );
}
