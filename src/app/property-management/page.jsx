import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import HolidaySearch from "@/components/HolidaySearch";
import PMCalc from "@/components/PMCalc";
import PMLeadForm from "@/components/PMLeadForm";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 300;

export async function generateMetadata() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return {
    title: "Управление недвижимостью в Батуми — Baylux Holiday Homes",
    description:
      "Квартиры и апартаменты под управлением Baylux в Батуми: посуточная и долгосрочная аренда. Сдайте свою квартиру в управление — гости, уборка и отчёты на нас.",
    alternates: { canonical: "/property-management" },
    openGraph: {
      title: "Baylux Holiday Homes — управление недвижимостью в Батуми",
      description: "Жильё под управлением Baylux и сдача вашей квартиры в управление.",
      type: "website",
      url: "https://bayluxhome.com/property-management",
      images: ["/hero-batumi.jpg"],
    },
  };
}

export default async function PropertyManagementPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);

  const all = await getAllUnits();
  const managed = all.filter((u) => u.managed);
  // Пока объекты не помечены флагом — временно показываем аренду/посуточно как витрину.
  const showcase = (managed.length ? managed : all.filter((u) => ["daily", "rent"].includes(u.deal))).slice(0, 12);

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
    name: "Property management in Batumi — Baylux Holiday Homes",
    serviceType: "Property management",
    provider: { "@type": "Organization", name: "Baylux", url: "https://bayluxhome.com" },
    areaServed: { "@type": "City", name: "Batumi" },
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

      {/* HERO — гостевой. TODO(brand): фон /hero-holiday.jpg и лого /holiday_logo_white.svg, когда пришлёт бренд. */}
      <section style={{ position: "relative", background: "var(--navy)", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "url(/hero-holiday.jpg)", backgroundSize: "cover", backgroundPosition: "center", opacity: 0.38 }} />
        <div className="wrap" style={{ position: "relative", paddingBlock: "60px 64px", textAlign: "center" }}>
          <img src="/baylux_logo_white.svg" alt="Baylux Holiday Homes" style={{ height: 54, margin: "0 auto 6px", display: "block" }} />
          <div style={{ color: "var(--gold)", letterSpacing: 3, fontSize: 13, fontWeight: 700, textTransform: "uppercase", marginBottom: 18 }}>Holiday Homes</div>
          <h1 style={{ color: "#fff", maxWidth: 740, margin: "0 auto", fontSize: "clamp(26px,4vw,40px)", lineHeight: 1.2 }}>{t("hh_h1")}</h1>
          <p style={{ color: "rgba(255,255,255,.85)", maxWidth: 600, margin: "14px auto 26px", fontSize: 16, lineHeight: 1.55 }}>{t("hh_sub")}</p>
          <HolidaySearch />
        </div>
      </section>

      <div className="wrap" style={{ paddingBlock: "40px 60px" }}>
        {/* Витрина управляемых объектов */}
        <h2 style={{ color: "var(--navy)", margin: "0 0 16px" }}>{t("hh_list_h")}</h2>
        {showcase.length === 0 ? (
          <p style={{ color: "var(--ink-soft)", maxWidth: 700 }}>{t("hh_empty")}</p>
        ) : (
          <>
            <div className="cards">
              {showcase.map((u) => <PropertyCard key={u.id} unit={u} />)}
            </div>
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <Link className="btn btn-ghost" href="/catalog?managed=1">{t("ld_all")}</Link>
            </div>
          </>
        )}

        {/* ===== Блок для собственников ===== */}
        <section style={{ marginTop: 60, borderTop: "2px solid var(--line)", paddingTop: 40 }}>
          <h2 style={{ color: "var(--navy)", margin: "0 0 6px" }}>{t("hh_owner_h")}</h2>
          <p style={{ color: "var(--ink-soft)", maxWidth: 760, margin: "0 0 24px", lineHeight: 1.6 }}>{t("hh_owner_p")}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {cards.map(([ic, h, p]) => (
              <div key={h} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 20px" }}>
                <div style={{ fontSize: 30 }}>{ic}</div>
                <h3 style={{ color: "var(--navy)", margin: "10px 0 6px", fontSize: 18 }}>{h}</h3>
                <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14, lineHeight: 1.55 }}>{p}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginTop: 28 }}>
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

          <h2 style={{ color: "var(--navy)", margin: "40px 0 18px" }}>{t("pm_steps_h")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
            {steps.map(([s, d], i) => (
              <div key={s} style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "18px 16px" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--navy)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{i + 1}</div>
                <div style={{ fontWeight: 700, color: "var(--navy)", margin: "10px 0 4px", fontSize: 15 }}>{s}</div>
                <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{d}</div>
              </div>
            ))}
          </div>

          <h2 style={{ color: "var(--navy)", margin: "40px 0 12px" }}>{t("pm_faq_h")}</h2>
          <div style={{ maxWidth: 820 }}>
            {faq.map(([q, a]) => (
              <details key={q} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--navy)", fontSize: 15 }}>{q}</summary>
                <p style={{ color: "var(--ink-soft)", margin: "8px 0 2px", lineHeight: 1.6, fontSize: 14 }}>{a}</p>
              </details>
            ))}
          </div>

          <div style={{ maxWidth: 560, margin: "40px auto 0" }}>
            <PMLeadForm />
          </div>
        </section>
      </div>
    </>
  );
}
