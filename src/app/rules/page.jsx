import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";
import { DOC_VERSION, DOC_UPDATED } from "@/config";

export const metadata = { title: "Правила размещения" };

export default function RulesPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <div className="wrap cms">
      <h1>{t("rl_title")}</h1>
      <p className="muted">{t("tm_disclaimer")}</p>
      <p>{t("rl_intro")}</p>

      <h2>{t("rl_h_rights")}</h2>
      <p>{t("rl_rights")}</p>

      <h2>{t("rl_h_forbidden")}</h2>
      <ul>
        <li>{t("rl_f1")}</li>
        <li>{t("rl_f2")}</li>
        <li>{t("rl_f3")}</li>
        <li>{t("rl_f4")}</li>
        <li>{t("rl_f5")}</li>
      </ul>

      <h2>{t("rl_h_moder")}</h2>
      <p>{t("rl_moder")}</p>

      <h2>{t("rl_h_contact")}</h2>
      <p>{t("rl_contact")}</p>

      <p className="muted" style={{ marginTop: 20 }}>{t("doc_updated")}: {DOC_UPDATED} · {t("doc_version")} {DOC_VERSION}</p>
    </div>
  );
}
