"use client";
import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/components/LangContext";

// { d: сделка, c: категория } → ярлык "сделка · категория"; либо lk: прямой ключ перевода
const CATS = [
  { d: "sale", c: "apartment", href: "/catalog?deal=sale&cat=apartment", ic: "🛋️" },
  { d: "sale", c: "house", href: "/catalog?deal=sale&cat=house", ic: "🏠" },
  { d: "sale", c: "commercial", href: "/catalog?deal=sale&cat=commercial", ic: "🏬" },
  { d: "sale", c: "office", href: "/catalog?deal=sale&cat=office", ic: "🏢" },
  { d: "sale", c: "warehouse", href: "/catalog?deal=sale&cat=warehouse", ic: "📦" },
  { d: "sale", c: "land", href: "/catalog?deal=sale&cat=land", ic: "🌳" },
  { d: "sale", c: "garage", href: "/catalog?deal=sale&cat=garage", ic: "🚗" },
  { d: "rent", c: "apartment", href: "/catalog?deal=rent&cat=apartment", ic: "🛏️" },
  { d: "rent", c: "house", href: "/catalog?deal=rent&cat=house", ic: "🏡" },
  { d: "rent", c: "commercial", href: "/catalog?deal=rent&cat=commercial", ic: "🏪" },
  { d: "rent", c: "office", href: "/catalog?deal=rent&cat=office", ic: "💼" },
  { d: "rent", c: "garage", href: "/catalog?deal=rent&cat=garage", ic: "🅿️" },
  { lk: "cat_jk", href: "/catalog?new=1", ic: "🏙️" },
  { d: "daily", c: "apartment", href: "/catalog?deal=daily&cat=apartment", ic: "🏖️" },
  { d: "daily", c: "house", href: "/catalog?deal=daily&cat=house", ic: "🏝️" },
  { lk: "foot_mgmt", href: "/#services", ic: "🔑" },
  { lk: "foot_cleaning", href: "/#services", ic: "🧹" },
  { lk: "foot_realtors", href: "/#services", ic: "🤝" },
];

export default function CategoryGrid() {
  const { t } = useLang();
  const [all, setAll] = useState(false);
  const label = (it) => (it.lk ? t(it.lk) : `${t("deal_" + it.d)} · ${t("cat_" + it.c)}`);
  const list = all ? CATS : CATS.slice(0, 8);
  return (
    <section className="cats wrap">
      <div className="sec-head"><div><h2>{t("cat_title")}</h2><p>{t("cat_subtitle")}</p></div></div>
      <div className="cat-grid">
        {list.map((it) => (
          <Link key={it.href + (it.lk || it.c)} href={it.href} className="cat">
            <span className="cat-t">{label(it)}</span>
            <span className="cat-badge" aria-hidden="true">{it.ic}</span>
          </Link>
        ))}
      </div>
      <button className="cat-more" onClick={() => setAll((v) => !v)}>
        <span className="cm-ic">{all ? "−" : "+"}</span>{all ? t("collapse") : t("show_all")}
      </button>
    </section>
  );
}
