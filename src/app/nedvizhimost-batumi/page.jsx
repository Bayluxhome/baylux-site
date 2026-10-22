import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import LeadButton from "@/components/LeadButton";
import { getAllUnits } from "@/data/source";
import { stripPrivate } from "@/lib/privacy";
import { getLang } from "@/lib/serverLang";
import { altFor, withLang } from "@/lib/i18nPath";
import { t as tr, translitAddress } from "@/lib/dict";
import { fmtMoney } from "@/data/data";
import { SITE_URL } from "@/config";

// Главная посадочная под запрос «недвижимость в Батуми» (22.10.2026).
// Живые цифры из базы (сколько объектов, медианы цен), ссылки на все разделы по Батуми,
// популярные дома/ЖК (внутренняя перелинковка), свежие объекты, FAQ с разметкой FAQPage.
export const dynamic = "force-dynamic";

const median = (arr) => {
  const a = arr.filter((x) => Number.isFinite(x) && x > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
};
const round = (n, step) => (n ? Math.round(n / step) * step : n);

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: { absolute: t("nbt_mt") },
    description: t("nbt_md"),
    alternates: altFor(lang, "/nedvizhimost-batumi"),
    openGraph: { title: t("nbt_mt"), description: t("nbt_md"), type: "website", url: withLang(lang, "/nedvizhimost-batumi"), images: ["/hero-batumi.jpg"] },
  };
}

export default async function NedvizhimostBatumiPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const L = (h) => withLang(lang, h);

  const all = (await getAllUnits()).filter((u) => u.building?.district === "Батуми");
  const sale = all.filter((u) => u.deal === "sale");
  const rent = all.filter((u) => u.deal === "rent");
  const daily = all.filter((u) => u.deal === "daily");
  const usd = (u) => (u.currency === "USD" ? u.priceNum : null);
  const m2 = round(median(sale.map((u) => (u.currency === "USD" && u.area > 0 && u.priceNum ? u.priceNum / u.area : null))), 10);
  const saleMed = round(median(sale.map(usd)), 1000);
  const rentMed = round(median(rent.map(usd)), 50);

  // Популярные дома/ЖК Батуми — по числу объявлений (внутренние ссылки на страницы домов).
  const byB = new Map();
  for (const u of all) {
    const b = u.building;
    if (!byB.has(b.slug)) byB.set(b.slug, { b, n: 0 });
    byB.get(b.slug).n++;
  }
  const topB = [...byB.values()].filter((x) => x.n >= 2).sort((a, c) => c.n - a.n).slice(0, 16);
  const fresh = [...all].sort((a, c) => String(c.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 12);

  const sections = [
    ["/kupit-kvartiru-batumi", t("nbt_s_buy"), sale.length],
    ["/arenda-batumi", t("nbt_s_rent"), rent.length],
    ["/posutochno-batumi", t("nbt_s_daily"), daily.length],
    ["/novostroyki", t("nbt_s_new"), null],
    ["/apartamenty-batumi", t("nbt_s_apart"), null],
    ["/property-management", t("nbt_s_mgmt"), null],
  ];

  const faq = [1, 2, 3, 4, 5].map((i) => [t("nbt_fq" + i), t("nbt_fa" + i)
    .replace("{m2}", m2 ? fmtMoney(m2, "USD") : "—")
    .replace("{rent}", rentMed ? fmtMoney(rentMed, "USD") : "—")]);
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const crumbsJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Baylux", item: `${SITE_URL}/${lang}` },
      { "@type": "ListItem", position: 2, name: t("nbt_h1"), item: `${SITE_URL}/${lang}/nedvizhimost-batumi` },
    ],
  };

  const stat = (v, l) => (
    <div className="nbt-stat"><b>{v}</b><span>{l}</span></div>
  );

  return (
    <div className="wrap" style={{ paddingBlock: "26px 56px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbsJson) }} />

      <div className="crumbs">
        <Link href={L("/")}>{t("crumb_home")}</Link> · <span>{t("nbt_h1")}</span>
      </div>

      <h1 style={{ color: "var(--navy)", marginTop: 8, maxWidth: 860 }}>{t("nbt_h1")}</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 860, lineHeight: 1.65, margin: "10px 0 18px" }}>{t("nbt_intro")}</p>

      <div className="nbt-stats">
        {stat(all.length, t("nbt_st_all"))}
        {stat(sale.length, t("nbt_st_sale"))}
        {stat(rent.length, t("nbt_st_rent"))}
        {stat(daily.length, t("nbt_st_daily"))}
        {m2 ? stat(fmtMoney(m2, "USD"), t("nbt_st_m2")) : null}
        {rentMed ? stat(fmtMoney(rentMed, "USD"), t("nbt_st_rentmed")) : null}
      </div>

      <h2 style={{ color: "var(--navy)", margin: "30px 0 12px" }}>{t("nbt_sections_h")}</h2>
      <div className="nbt-sections">
        {sections.map(([href, label, n]) => (
          <Link key={href} href={L(href)} className="nbt-sec">
            <span>{label}</span>{n != null && <b>{n}</b>}<i>→</i>
          </Link>
        ))}
      </div>

      <h2 style={{ color: "var(--navy)", margin: "34px 0 14px" }}>{t("nbt_fresh_h")}</h2>
      <div className="cards">
        {fresh.map((u) => <PropertyCard key={u.id} unit={stripPrivate(u)} />)}
      </div>
      <div style={{ marginTop: 20, textAlign: "center" }}>
        <Link className="btn btn-ghost" href={L("/catalog?city=" + encodeURIComponent("Батуми"))}>{t("ld_all")}</Link>
      </div>

      {topB.length > 0 && (
        <>
          <h2 style={{ color: "var(--navy)", margin: "38px 0 12px" }}>{t("nbt_top_h")}</h2>
          <div className="nbt-buildings">
            {topB.map(({ b, n }) => {
              const name = (b.complex ? `${b.complex}, ` : "") + translitAddress(b["name_" + lang] || b.name, lang, b.kind);
              return <Link key={b.slug} href={L(`/building/${b.slug}`)}>{name} <span>· {n}</span></Link>;
            })}
          </div>
        </>
      )}

      <section className="article-body" style={{ marginTop: 40, maxWidth: 860 }}>
        <h2 style={{ color: "var(--navy)" }}>{t("nbt_guide_h")}</h2>
        <p>{t("nbt_guide_p1")}</p>
        <p>{t("nbt_guide_p2")}</p>
        <p>{t("nbt_guide_p3")}</p>
      </section>

      <section style={{ marginTop: 40, maxWidth: 860 }}>
        <h2 style={{ color: "var(--navy)", marginBottom: 14 }}>{t("ar_faq_h")}</h2>
        {faq.map(([q, a]) => (
          <div key={q} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
            <h3 style={{ color: "var(--navy)", fontSize: 16, margin: "0 0 6px" }}>{q}</h3>
            <p style={{ color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>{a}</p>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 40, background: "var(--cream)", borderRadius: 16, padding: "26px 24px", textAlign: "center" }}>
        <h2 style={{ color: "var(--navy)", margin: "0 0 14px" }}>{t("ar_cta_h")}</h2>
        <LeadButton className="btn btn-gold" type={t("nbt_h1")} typeKey="landing" object={t("nbt_h1")} title={t("ar_cta_btn")} source="landing">{t("ar_cta_btn")}</LeadButton>
      </section>
    </div>
  );
}
