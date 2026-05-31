import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { DOC_VERSION, DOC_UPDATED } from "@/config";

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

      <h2>{t("pv_proc_h")}</h2>
      <p>{t("pv_proc")}</p>

      <h2>{t("pv_cb_h")}</h2>
      <p>{t("pv_cb")}</p>

      <h2>{t("pv_consent_h")}</h2>
      <p>{t("pv_consent")}</p>

      <h2>{t("pv_h_rights")}</h2>
      <p>{t("pv_rights")}</p>

      <p className="muted" style={{ marginTop: 20 }}>{t("doc_updated")}: {DOC_UPDATED} · {t("doc_version")} {DOC_VERSION}</p>
    </div>
  );
}
