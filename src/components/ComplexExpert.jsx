import LeadButton from "@/components/LeadButton";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Блок «Поможем подобрать новостройку» с экспертом (риелтор из профиля) и кнопкой заявки.
// expert может быть null — тогда блок без персоны, заявка уходит в общий чат менеджеров.
// complexId — заявка уйдёт эксперту этого ЖК (см. api/lead).
export default function ComplexExpert({ expert, complexId = "", objectName = "" }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  return (
    <aside className="nb-help">
      <div className="nb-help-k">{t("nb_help_k")}</div>
      <h3>{t("nb_help_h")}</h3>
      <p>{t("nb_help_p")}</p>
      {expert && (
        <div className="nb-expert">
          <div className="nb-expert-ava">{expert.photo ? <img src={expert.photo} alt={expert.name} /> : <span>{(expert.name || "B").slice(0, 1).toUpperCase()}</span>}</div>
          <div>
            <div className="nb-expert-name">{expert.name}</div>
            <div className="nb-expert-role">{t("nb_expert_role")}</div>
            <div className="nb-expert-langs">{t("nb_langs")}</div>
          </div>
        </div>
      )}
      <LeadButton className="btn btn-navy nb-help-btn" type={t("nb_crumb")} typeKey="complex" object={objectName || t("nb_crumb")} title={t("nb_help_btn")} source="novostroyki" complexId={complexId}>
        ✉ {t("nb_help_btn")}
      </LeadButton>
    </aside>
  );
}
