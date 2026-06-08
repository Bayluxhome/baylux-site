import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import LeadButton from "@/components/LeadButton";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Шаблон SEO-лендинга под кластер запросов: H1 + интро + витрина + FAQ (с разметкой) + CTA.
// prefix — префикс ключей словаря (kb/ap/pb/nb), units — уже отфильтрованные объекты.
export default function SeoLanding({ prefix, slug, units, catalogHref, crumbLk, extraHref, extraLk }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const p = (k) => t(`${prefix}_${k}`);
  const shown = units.slice(0, 24);

  const faq = [1, 2, 3].map((i) => [p("fq" + i), p("fa" + i)]);
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Baylux", item: "https://bayluxhome.com" },
      { "@type": "ListItem", position: 2, name: p("h1"), item: `https://bayluxhome.com/${slug}` },
    ],
  };

  return (
    <div className="wrap" style={{ paddingBlock: "26px 56px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }} />

      <div className="crumbs">
        <Link href="/">{t("crumb_home")}</Link> · <Link href={catalogHref}>{t(crumbLk)}</Link> · <span>{p("list_h")}</span>
      </div>

      <h1 style={{ color: "var(--navy)", marginTop: 8, maxWidth: 820 }}>{p("h1")}</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 16, maxWidth: 820, lineHeight: 1.6, margin: "10px 0 22px" }}>{p("intro")}</p>
      {extraHref && (
        <p style={{ margin: "0 0 22px", fontSize: 15 }}>
          <Link href={extraHref} style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{t(extraLk)} →</Link>
        </p>
      )}

      <h2 style={{ color: "var(--navy)", margin: "10px 0 14px" }}>{p("list_h")}</h2>

      {shown.length === 0 ? (
        <p style={{ color: "var(--ink-soft)", maxWidth: 700 }}>{t("ld_empty")}</p>
      ) : (
        <>
          <div className="cards">
            {shown.map((u) => <PropertyCard key={u.id} unit={u} />)}
          </div>
          {units.length > shown.length && (
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Link className="btn btn-ghost" href={catalogHref}>{t("rl_strip_all")}</Link>
            </div>
          )}
        </>
      )}

      <section style={{ marginTop: 44, maxWidth: 820 }}>
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
        <LeadButton className="btn btn-gold" type={p("list_h")} object={p("h1")} title={t("ar_cta_btn")}>{t("ar_cta_btn")}</LeadButton>
      </section>
    </div>
  );
}
