import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";
import LeadButton from "@/components/LeadButton";
import { getByToken } from "@/lib/collections";
import { getAllUnits } from "@/data/source";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Публичная страница подборки /c/<token> (задача №07).
// Открывается без входа; только просмотр. Объекты берутся из ПУБЛИЧНОЙ выдачи — те же
// карточки, что в каталоге, с актуальными фото и ценами, без служебных данных.
// Снятые объекты показываются по снимку названия с пометкой «недоступен».
// Клиента, его контакты и id подборки страница не раскрывает — в адресе только токен.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const lang = getLang();
  const c = await getByToken(params.token);
  return { title: c && c.enabled ? (c.title || tr(lang, "col_page_h")) : tr(lang, "col_unavailable_h"), robots: { index: false, follow: false } };
}

export default async function CollectionPage({ params }) {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const c = await getByToken(params.token);

  if (!c || !c.enabled) {
    return (
      <div className="wrap" style={{ padding: "48px 24px", maxWidth: 560 }}>
        <h1 style={{ color: "var(--navy)" }}>{t("col_unavailable_h")}</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.6 }}>{t("col_unavailable_p")}</p>
        <Link className="btn btn-gold" href="/catalog" style={{ display: "inline-flex", marginTop: 18 }}>{t("foot_realty")}</Link>
      </div>
    );
  }

  const items = Array.isArray(c.items) ? c.items : [];
  const all = await getAllUnits();
  const byId = new Map(all.map((u) => [String(u.id), u]));
  const live = items.map((i) => byId.get(i.id)).filter(Boolean);
  const gone = items.filter((i) => !byId.has(i.id));

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <div className="sec-head">
        <div>
          <h1 style={{ color: "var(--navy)" }}>{c.title || t("col_page_h")}</h1>
          <p>{t("col_page_p").replace("{n}", live.length)}</p>
        </div>
      </div>

      {live.length === 0 && gone.length === 0 && <p style={{ color: "var(--ink-soft)", padding: "30px 0" }}>{t("col_page_empty")}</p>}

      {live.length > 0 && (
        <div className="cards">
          {live.map((u) => <PropertyCard key={u.id} unit={u} qs={`?c=${c.token}`} />)}
        </div>
      )}

      {gone.length > 0 && (
        <div style={{ marginTop: 24, background: "#fbfaf7", border: "1px solid #eee5d5", borderRadius: 12, padding: "14px 18px" }}>
          <b style={{ color: "var(--navy)" }}>{t("col_gone_h")}</b>
          <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--ink-soft)", lineHeight: 1.7 }}>
            {gone.map((i) => <li key={i.id}>{i.title} — <span style={{ color: "#9a2b2b" }}>{t("col_gone_badge")}</span></li>)}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 28, background: "#fff", border: "1px solid var(--line)", borderRadius: 14, padding: "20px 22px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
        <div>
          <b style={{ color: "var(--navy)", fontSize: 16 }}>{t("col_cta_h")}</b>
          <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>{t("col_cta_p")}</div>
        </div>
        {/* Заявка уходит риелтору — владельцу подборки (см. api/lead: collectionToken) */}
        <LeadButton className="btn btn-gold" type={t("col_page_h")} typeKey="landing" object={c.title || t("col_page_h")} title={t("col_cta_btn")} source="collection" collectionToken={c.token}>{t("col_cta_btn")}</LeadButton>
      </div>
    </div>
  );
}
