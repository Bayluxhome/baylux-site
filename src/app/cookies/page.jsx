import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { DOC_VERSION, DOC_UPDATED } from "@/config";

export const metadata = { title: "Cookie" };

export default function CookiesPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("ck_title")}</h1>
      <p className="muted">{t("tm_disclaimer")}</p>
      <p>{t("ck_intro")}</p>

      <h2>{t("ck_h_what")}</h2>
      <p>{t("ck_what")}</p>

      <h2>{t("ck_h_types")}</h2>
      <ul>
        <li>{t("ck_nec_t")}</li>
        <li>{t("ck_an_t")}</li>
        <li>{t("ck_mk_t")}</li>
      </ul>

      <h2>{t("ck_h_manage")}</h2>
      <p>{t("ck_manage")}</p>

      <p className="muted" style={{ marginTop: 20 }}>{t("doc_updated")}: {DOC_UPDATED} · {t("doc_version")} {DOC_VERSION}</p>
    </div>
  );
}
