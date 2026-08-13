import Link from "next/link";
import { supa } from "@/lib/supabase";
import { getAllUnits } from "@/data/source";
import { matchRealtor } from "@/data/realtors";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Язык страницы зависит от запроса (getLang читает cookies/headers), поэтому ISR здесь нельзя —
// то же решение, что на страницах объекта и дома (иначе конфликт ISR + динамические данные).
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const lang = getLang();
  return {
    title: tr(lang, "meta_realtors_t"),
    description: tr(lang, "meta_realtors_d"),
    alternates: { canonical: "/realtors" },
  };
}

export default async function RealtorsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  let rows = [];
  if (supa) {
    const { data } = await supa.from("realtors").select("*").eq("status", "approved").order("created_at", { ascending: false });
    rows = data || [];
    // Считаем по ФАКТИЧЕСКОЙ выдаче сайта (та же дедупликация и архив, что в каталоге),
    // иначе число здесь расходилось бы с числом объектов на странице риелтора.
    const units = await getAllUnits();
    rows = rows.map((r) => ({ ...r, count: units.filter((u) => matchRealtor([r], u)).length }));
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
          {/* Вся карточка — ссылка на страницу риелтора с его объектами. Телефон вынесен
              из ссылки (вложенные <a> недопустимы) и лежит отдельным блоком под карточкой. */}
          {rows.map((r) => (
            <div key={r.id} className="realtor-card">
              <Link href={`/realtor/${r.id}`} className="realtor-link">
                <div className="realtor-ava">
                  {r.photo ? <img src={r.photo} alt={r.name} /> : <span>{(r.name || "B").slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="realtor-name">{r.name}</div>
                <div className="realtor-role">{t("rl_role")}{r.deal_types ? ` · ${r.deal_types}` : ""}</div>
                <div className="realtor-count realtor-count-link">{r.count} {t("w_objects")} →</div>
                {r.bio && <p className="realtor-bio">{r.bio}</p>}
              </Link>
              {r.phone && <a className="btn btn-ghost" href={`tel:${r.phone}`} style={{ marginTop: 10, padding: "8px 14px", fontSize: 13 }}>{r.phone}</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
