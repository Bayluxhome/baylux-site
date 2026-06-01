import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const revalidate = 120;
export const metadata = {
  title: "Риелторы Baylux в Батуми и Грузии",
  description: "Проверенные риелторы Baylux: продажа и аренда недвижимости в Батуми и по всей Грузии. Найдите своего агента.",
  alternates: { canonical: "/realtors" },
};

export default async function RealtorsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  let rows = [];
  if (supa) {
    const { data } = await supa.from("realtors").select("*").order("created_at", { ascending: false });
    rows = data || [];
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("rl_page_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 24px", lineHeight: 1.6, maxWidth: 720 }}>{t("rl_page_p")}</p>

      {rows.length === 0 ? (
        <div style={{ padding: "26px", border: "1px dashed var(--line)", borderRadius: 12, color: "var(--ink-soft)" }}>
          {t("rl_empty")} <a href="/my" style={{ color: "var(--gold-dk)", fontWeight: 600 }}>{t("rl_become")}</a>
        </div>
      ) : (
        <div className="realtor-grid">
          {rows.map((r) => (
            <div key={r.id} className="realtor-card">
              <div className="realtor-ava">
                {r.photo ? <img src={r.photo} alt={r.name} /> : <span>{(r.name || "B").slice(0, 1).toUpperCase()}</span>}
              </div>
              <div className="realtor-name">{r.name}</div>
              <div className="realtor-role">{t("rl_role")}{r.deal_types ? ` · ${r.deal_types}` : ""}</div>
              {r.bio && <p className="realtor-bio">{r.bio}</p>}
              {r.phone && <a className="btn btn-ghost" href={`tel:${r.phone}`} style={{ marginTop: 10, padding: "8px 14px", fontSize: 13 }}>{r.phone}</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
