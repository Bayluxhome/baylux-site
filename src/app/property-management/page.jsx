import PMCalc from "@/components/PMCalc";
import PMLeadForm from "@/components/PMLeadForm";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 3600;

export const metadata = {
  title: "Управление недвижимостью в Батуми",
  description:
    "Управление квартирой под ключ в Батуми: посуточная сдача, маркетинг на Booking и Airbnb, клининг, заселение гостей и ежемесячные отчёты. Ваш доход — 80%.",
  alternates: { canonical: "/property-management" },
  openGraph: {
    title: "Управление недвижимостью в Батуми | Baylux",
    description: "Зарабатывайте на посуточной аренде без забот — мы берём всё на себя, от фото до отчётов.",
    type: "website",
    url: "https://bayluxhome.com/property-management",
    images: ["/hero-batumi.jpg"],
  },
};

export default function PropertyManagementPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);

  const cards = [
    ["📸", t("pm_c1_h"), t("pm_c1_p")],
    ["📣", t("pm_c2_h"), t("pm_c2_p")],
    ["🛎️", t("pm_c3_h"), t("pm_c3_p")],
    ["🧹", t("pm_c4_h"), t("pm_c4_p")],
  ];
  const steps = [
    [t("pm_st1"), t("pm_st1_d")],
    [t("pm_st2"), t("pm_st2_d")],
    [t("pm_st3"), t("pm_st3_d")],
    [t("pm_st4"), t("pm_st4_d")],
  ];
  const faq = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => [t("pm_fq" + i), t("pm_fa" + i)]);

  const serviceJson = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Property management in Batumi",
    serviceType: "Property management",
    provider: { "@type": "Organization", name: "Baylux", url: "https://bayluxhome.com" },
    areaServed: { "@type": "City", name: "Batumi" },
    description: metadata.description,
    url: "https://bayluxhome.com/property-management",
  };
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJson) }} />

      {/* HERO. TODO(brand): заменить фон на фирменное фото квартиры. */}
      <section style={{ position: "relative", background: "var(--navy)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/hero-batumi.webp)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.28 }} />
        <div className="wrap" style={{ position: "relative", paddingBlock: "72px 76px", textAlign: "center" }}>
          <h1 style={{ color: "#fff", maxWidth: 760, margin: "0 auto", fontSize: "clamp(28px,4.5vw,44px)", lineHeight: 1.2 }}>{t("pm_h1")}</h1>
          <p style={{ color: "rgba(255,255,255,.85)", maxWidth: 620, margin: "16px auto 28px", fontSize: 17, lineHeight: 1.55 }}>{t("pm_sub")}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-gold" href="#pm-calc">{t("pm_cta1")}</a>
            <a className="btn btn-ghost" href="#pm-form" style={{ background: "rgba(255,255,255,.92)" }}>{t("pm_cta2")}</a>
          </div>
        </div>
      </section>

      <div className="wrap" style={{ paddingBlock: "40px 60px" }}>
        {/* 4 услуги */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {cards.map(([ic, h, p]) => (
            <div key={h} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 20px" }}>
              <div style={{ fontSize: 30 }}>{ic}</div>
              <h3 style={{ color: "var(--navy)", margin: "10px 0 6px", fontSize: 18 }}>{h}</h3>
              <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14, lineHeight: 1.55 }}>{p}</p>
            </div>
          ))}
        </div>

        {/* Калькулятор + комиссия */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginTop: 36 }}>
          <PMCalc />
          <div style={{ background: "var(--cream)", borderRadius: 16, padding: "24px 22px" }}>
            <h2 style={{ color: "var(--navy)", margin: "0 0 14px" }}>{t("pm_fee_h")}</h2>
            {[
              [t("pm_fee_row1l"), t("pm_fee_row1r"), true],
              [t("pm_fee_row2l"), t("pm_fee_row2r"), false],
              [t("pm_fee_row3l"), t("pm_fee_row3r"), false],
            ].map(([l, r, hot]) => (
              <div key={l} style={{ display: "grid", gridTemplateColumns: "minmax(120px,38%) 1fr", gap: 12, padding: "12px 0", borderTop: "1px solid rgba(1,29,60,.12)" }}>
                <b style={{ color: hot ? "var(--gold-dk)" : "var(--navy)", fontSize: 15 }}>{l}</b>
                <span style={{ color: "var(--ink)", fontSize: 14, lineHeight: 1.5 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Шаги */}
        <h2 style={{ color: "var(--navy)", margin: "44px 0 18px" }}>{t("pm_steps_h")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
          {steps.map(([s, d], i) => (
            <div key={s} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{i + 1}</div>
              <div style={{ fontWeight: 700, color: "var(--navy)", margin: "10px 0 4px", fontSize: 15 }}>{s}</div>
              <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 style={{ color: "var(--navy)", margin: "44px 0 12px" }}>{t("pm_faq_h")}</h2>
        <div style={{ maxWidth: 820 }}>
          {faq.map(([q, a]) => (
            <details key={q} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--navy)", fontSize: 15 }}>{q}</summary>
              <p style={{ color: "var(--ink-soft)", margin: "8px 0 2px", lineHeight: 1.6, fontSize: 14 }}>{a}</p>
            </details>
          ))}
        </div>

        {/* Форма */}
        <div style={{ maxWidth: 560, margin: "44px auto 0" }}>
          <PMLeadForm />
        </div>
      </div>
    </>
  );
}
