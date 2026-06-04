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
    const { data } = await supa.from("realtors").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(8);
    rows = data || [];
    // Число опубликованных объявлений на риелтора (по email или Telegram-id)
    const { data: lst } = await supa.from("listings").select("owner_email, tg_user_id").eq("status", "approved");
    const byEmail = {}, byTg = {};
    (lst || []).forEach((l) => {
      if (l.owner_email) { const k = String(l.owner_email).toLowerCase(); byEmail[k] = (byEmail[k] || 0) + 1; }
      if (l.tg_user_id != null) { const k = String(l.tg_user_id); byTg[k] = (byTg[k] || 0) + 1; }
    });
    rows = rows.map((r) => ({ ...r, count: r.tg_user_id != null ? (byTg[String(r.tg_user_id)] || 0) : (byEmail[String(r.email || "").toLowerCase()] || 0) }));
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
            <div className="realtor-count">{r.count} {t("w_objects")}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
