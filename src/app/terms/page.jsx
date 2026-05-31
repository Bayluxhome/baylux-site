import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const metadata = { title: "Условия использования" };

export default function TermsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("tm_title")}</h1>
      <p className="muted">{t("tm_disclaimer")}</p>

      <h2>{t("tm_h1")}</h2>
      <p>{t("tm_p1")}</p>

      <h2>{t("tm_h2")}</h2>
      <p>{t("tm_p2")}</p>

      <h2>{t("tm_h3")}</h2>
      <p>{t("tm_p3")}</p>

      <h2>{t("tm_h4")}</h2>
      <p>{t("tm_p4")}</p>

      <h2>{t("tm_h5")}</h2>
      <p>{t("tm_p5")}</p>
    </div>
  );
}
