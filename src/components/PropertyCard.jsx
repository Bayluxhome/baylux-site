"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { DEAL_CLASS, fmtMoney } from "@/data/data";
import FavButton from "@/components/FavButton";
import { useLang } from "@/components/LangContext";
import { typeLabel, cityLabel, translitAddress } from "@/lib/dict";

// Русское склонение для бейджа дублей: 1 дубль / 2-4 дубля / 5+ дублей (en/ka — формы совпадают).
function dupePluralKey(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "dupe_badge_one";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "dupe_badge_few";
  return "dupe_badge_many";
}

// Тонкие монохромные иконки характеристик — в стиле Korter.
const IcBed = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 14h18" /><path d="M7 9V7.5A1.5 1.5 0 0 1 8.5 6h3A1.5 1.5 0 0 1 13 7.5V9" /><path d="M3 18v2M21 18v2" /></svg>);
const IcArea = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h3M4 14h3M9 20v-3M14 20v-3" /></svg>);
const IcFloor = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-5h6v5" /></svg>);
const IcRefresh = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 4v4h-4" /></svg>);

const LOCALE = { ru: "ru-RU", en: "en-US", ka: "ka-GE" };
function fmtDate(iso, lang) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(LOCALE[lang] || "ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch (e) {
    return "";
  }
}

export default function PropertyCard({ unit }) {
  const { t, lang } = useLang();
  const stripRef = useRef(null);
  const [pidx, setPidx] = useState(0);
  const onStripScroll = () => {
    const el = stripRef.current;
    if (el && el.clientWidth) setPidx(Math.round(el.scrollLeft / el.clientWidth));
  };
  // Листание стрелками на десктопе: не даём клику открыть карточку, прокручиваем ленту фото.
  const goStrip = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const el = stripRef.current;
    if (!el || !el.clientWidth) return;
    const n = unit.photos ? unit.photos.length : 1;
    const target = Math.max(0, Math.min(n - 1, pidx + dir));
    el.scrollTo({ left: target * el.clientWidth, behavior: "smooth" });
  };
  const b = unit.building;
  const rs = t("rooms_short");
  const dupeText = unit.dupeCount > 0 ? t(dupePluralKey(unit.dupeCount)).replace("{n}", unit.dupeCount) : "";
  const ty = typeLabel(lang, unit.type);
  const district = cityLabel(lang, b.district || "Батуми");
  const bname = translitAddress(b["name_" + lang] || b.name, lang, b.kind);
  const photos = unit.photos && unit.photos.length > 1 ? unit.photos : null;
  const sqm = t("sqm");
  const priceSuffix = unit.deal === "rent" ? t("ps_rent") : unit.deal === "daily" ? t("ps_daily") : "";
  const perWord = unit.deal === "rent" ? t("per_rent") : unit.deal === "daily" ? t("per_daily") : "";
  const alt = `${ty}, ${unit.area} ${sqm} — ${bname}`;
  const hasFloor = unit.floor && unit.floor !== "—";
  const hasArea = unit.area && Number(unit.area) > 0;
  const dateStr = fmtDate(unit.created_at, lang);
  const sub = `${district}${b.developer ? ` · ${b.developer}` : ""}`;

  // Первая характеристика — как у Korter: для квартир только комнаты («2 комн.»),
  // для студий/коммерции — сам тип, для прочего (дом и т.п.) — «Тип, N комн.».
  const FLAT_TYPES = new Set(["Квартира", "Новостройка", "Апартаменты", "Апартамент"]);
  const TYPE_ONLY = new Set(["Студия", "Коммерция", "Офис", "Помещение", "Участок", "Земля"]);
  let firstSpec;
  if (TYPE_ONLY.has(unit.type)) firstSpec = ty;
  else if (unit.rooms) firstSpec = FLAT_TYPES.has(unit.type) ? `${unit.rooms} ${rs}` : `${ty}, ${unit.rooms} ${rs}`;
  else firstSpec = ty;
  const specs = [
    { ic: <IcBed key="b" />, txt: firstSpec },
    ...(hasArea ? [{ ic: <IcArea key="a" />, txt: `${unit.area} ${sqm}` }] : []),
    ...(hasFloor ? [{ ic: <IcFloor key="f" />, txt: unit.floor }] : []),
  ];
  const fav = { slug: unit.slug, href: `/property/${unit.slug}`, title: `${ty}${unit.rooms ? `, ${unit.rooms} ${rs}` : ""}, ${unit.area} м²`, sub: `📍 ${district} · ${bname}`, price: unit.price, img: unit.img };
  return (
    <Link className="card" href={`/property/${unit.slug}`}>
      <div className="ph">
        {photos ? (
          <div className="ph-strip" ref={stripRef} onScroll={onStripScroll}>
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
        {unit.managed && <span className="managed-badge">🏠 {t("managed_badge")}</span>}
        {dupeText && <span className="dupe-badge">{dupeText}</span>}
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
        <div className="price">
          {unit.priceNum
            ? <><span className="bx-price" data-num={unit.priceNum} data-cur={unit.currency}>{fmtMoney(unit.priceNum, unit.currency)}</span>{priceSuffix}</>
            : unit.price}
          {unit.deal === "sale" && unit.perM2
            ? <span className="perm"><span className="bx-price" data-num={unit.perM2} data-cur={unit.currency}>{fmtMoney(unit.perM2, unit.currency)}</span> {t("per_m2")}</span>
            : null}
        </div>
        <div className="cspecs">
          {specs.map((s, i) => <span className="cspec" key={i}>{s.ic}{s.txt}</span>)}
        </div>
        <div className="caddr">{bname}</div>
        <div className="cdistrict">{sub}</div>
        {dateStr ? <div className="cdate"><IcRefresh />{dateStr}</div> : null}
      </div>
    </Link>
  );
}
