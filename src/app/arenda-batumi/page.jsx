import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import LeadButton from "@/components/LeadButton";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export const metadata = {
  title: "Снять квартиру в Батуми — долгосрочная аренда жилья",
  description:
    "Снять квартиру в Батуми на длительный срок: проверенные квартиры и апартаменты у моря, прозрачные цены и помощь местной команды Baylux.",
  alternates: { canonical: "/arenda-batumi" },
  openGraph: {
    title: "Снять квартиру в Батуми — долгосрочная аренда",
    description: "Долгосрочная аренда квартир и апартаментов в Батуми у моря — проверенные объекты, прозрачные цены.",
    type: "website",
    url: "https://bayluxhome.com/arenda-batumi",
    images: ["/hero-batumi.jpg"],
  },
};

export default async function ArendaBatumiPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);

  let units = await getAllUnits();
  units = units.filter((u) => u.deal === "rent" && u.building?.district === "Батуми");
  const shown = units.slice(0, 24);

  const faq = [
    [t("ar_faq_q1"), t("ar_faq_a1")],
    [t("ar_faq_q2"), t("ar_faq_a2")],
    [t("ar_faq_q3"), t("ar_faq_a3")],
  ];
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Baylux", item: "https://bayluxhome.com" },
      { "@type": "ListItem", position: 2, name: t("ar_h1"), item: "https://bayluxhome.com/arenda-batumi" },
    ],
  };

  return (
    <div className="wrap" style={{ paddingBlock: "26px 56px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />

      <div className="crumbs">
        <Link href="/">{t("crumb_home")}</Link> · <Link href="/catalog?deal=rent">{t("nav_rent")}</Link> · <span>{t("ar_list_h")}</span>
      </div>

      <h1 style={{ color: "var(--navy)", marginTop: 8, maxWidth: 820 }}>{t("ar_h1")}</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 820, lineHeight: 1.6, marginTop: 10 }}>{t("ar_intro")}</p>

      <ul style={{ margin: "16px 0 6px", paddingLeft: 0, listStyle: "none", display: "grid", gap: 8, maxWidth: 820 }}>
        {[t("ar_b1"), t("ar_b2"), t("ar_b3")].map((b, i) => (
          <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "var(--ink)", fontSize: 15 }}>
            <span style={{ color: "var(--gold-dk)", fontWeight: 800 }}>✓</span>{b}
          </li>
        ))}
      </ul>

      <p style={{ margin: "8px 0 22px", fontSize: 15 }}>
        <Link href="/catalog?deal=daily" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{t("ar_daily_q")} →</Link>
      </p>

      <h2 style={{ color: "var(--navy)", margin: "10px 0 14px" }}>{t("ar_list_h")}</h2>

      {shown.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", maxWidth: 700 }}>{t("ar_empty")}</p>
      ) : (
        <>
          <div className="cards">
            {shown.map((u) => <PropertyCard key={u.id} unit={u} />)}
          </div>
          {units.length > shown.length && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Link className="btn btn-ghost" href="/catalog?deal=rent&city=Батуми">{t("rl_strip_all")}</Link>
            </div>
          )}
        </>
      )}

      <section style={{ marginTop: 44, maxWidth: 820 }}>
        <h2 style={{ color: "var(--navy)", marginBottom: 14 }}>{t("ar_faq_h")}</h2>
        {faq.map(([q, a], i) => (
          <div key={i} style={{ borderTop: "1px solid var(--line)", padding: "14px 0" }}>
            <h3 style={{ color: "var(--navy)", fontSize: 16, margin: "0 0 6px" }}>{q}</h3>
            <p style={{ color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>{a}</p>
          </div>
        ))}
      </section>

      <section style={{ marginTop: 40, background: "var(--cream)", borderRadius: 16, padding: "26px 24px", textAlign: "center" }}>
        <h2 style={{ color: "var(--navy)", margin: "0 0 14px" }}>{t("ar_cta_h")}</h2>
        <LeadButton className="btn btn-gold" type={t("nav_rent")} object={t("ar_list_h")} title={t("ar_cta_btn")}>{t("ar_cta_btn")}</LeadButton>
      </section>
    </div>
  );
}
