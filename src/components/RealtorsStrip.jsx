import Link from "next/link";
import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

// Блок риелторов на главной (привлечение агентов).
export default async function RealtorsStrip() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  let rows = [];
  if (supa) {
    const { data } = await supa.from("realtors").select("*").order("created_at", { ascending: false }).limit(8);
    rows = data || [];
  }
  if (!rows.length) return null;

  return (
    <section className="wrap" style={{ paddingBlock: "10px 30px" }}>
      <div className="sec-head">
        <div><h2>{t("rl_strip_h")}</h2><p>{t("rl_strip_p")}</p></div>
        <Link className="btn btn-ghost" href="/realtors">{t("rl_strip_all")}</Link>
      </div>
      <div className="realtor-grid">
        {rows.map((r) => (
          <Link key={r.id} href="/realtors" className="realtor-card">
            <div className="realtor-ava">
              {r.photo ? <img src={r.photo} alt={r.name} /> : <span>{(r.name || "B").slice(0, 1).toUpperCase()}</span>}
            </div>
            <div className="realtor-name">{r.name}</div>
            <div className="realtor-role">{t("rl_role")}{r.deal_types ? ` · ${r.deal_types}` : ""}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
