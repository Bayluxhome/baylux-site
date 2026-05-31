import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const metadata = { title: "Политика конфиденциальности" };

export default function PrivacyPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("pv_title")}</h1>
      <p className="muted">{t("tm_disclaimer")}</p>

      <h2>{t("pv_h_what")}</h2>
      <ul>
        <li>{t("pv_what1")}</li>
        <li>{t("pv_what2")}</li>
        <li>{t("pv_what3")}</li>
      </ul>

      <h2>{t("pv_h_why")}</h2>
      <p>{t("pv_why")}</p>

      <h2>{t("pv_h_store")}</h2>
      <p>{t("pv_store")}</p>

      <h2>{t("pv_h_rights")}</h2>
      <p>{t("pv_rights")}</p>
    </div>
  );
}
