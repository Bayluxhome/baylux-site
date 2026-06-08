import LeadButton from "@/components/LeadButton";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// TODO: полноценный раздел клининга — следующий спринт (прайс, виды уборки, фото).
export const metadata = {
  title: "Клининг в Батуми — уборка квартир и апартаментов",
  description: "Профессиональная уборка квартир в Батуми: после гостей, генеральная и регулярная. Заявка онлайн — рассчитаем стоимость.",
  alternates: { canonical: "/cleaning" },
};

export default function CleaningPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap" style={{ paddingBlock: "44px 70px", textAlign: "center" }}>
      <div style={{ fontSize: 44 }}>🧹</div>
      <h1 style={{ color: "var(--navy)", margin: "10px 0 12px" }}>{t("cl_h1")}</h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: 640, margin: "0 auto 26px", lineHeight: 1.6 }}>{t("cl_p")}</p>
      <LeadButton className="btn btn-gold" type="Клининг" object="Cleaning Batumi" title={t("cl_btn")}>{t("cl_btn")}</LeadButton>
    </div>
  );
}
