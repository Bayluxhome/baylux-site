"use client";
import Link from "next/link";
import Image from "next/image";
import { DEAL_CLASS, fmtMoney, perSuffix } from "@/data/data";
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
  const b = unit.building;
  const rs = t("rooms_short");
  const dupeText = unit.dupeCount > 0 ? t(dupePluralKey(unit.dupeCount)).replace("{n}", unit.dupeCount) : "";
  const ty = typeLabel(lang, unit.type);
  const district = cityLabel(lang, b.district || "Батуми");
  const bname = b["name_" + lang] || translitAddress(b.name, lang, b.kind);
  const photos = unit.photos && unit.photos.length > 1 ? unit.photos : null;
  const alt = `${ty}, ${unit.area} м² — ${bname}`;
  const hasFloor = unit.floor && unit.floor !== "—";
  const dateStr = fmtDate(unit.created_at, lang);
  const sub = `${district}${b.developer ? ` · ${b.developer}` : ""}`;
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
        {dupeText && <span className="dupe-badge">{dupeText}</span>}
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
        <div className="cspecs">
          <span><IcBed />{ty}{unit.rooms ? `, ${unit.rooms} ${rs}` : ""}</span>
          <span><IcArea />{unit.area} м²</span>
          {hasFloor ? <span><IcFloor />{unit.floor}</span> : null}
        </div>
        <div className="caddr">{bname}</div>
        <div className="cdistrict">{sub}</div>
        {dateStr ? <div className="cdate"><IcRefresh />{dateStr}</div> : null}
      </div>
    </Link>
  );
}
