import Link from "next/link";
import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr, newsField } from "@/lib/dict";

function fmtDate(s, lang) {
  try { return new Date(s).toLocaleDateString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default async function NewsStrip() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  let rows = [];
  if (supa) {
    const { data } = await supa.from("news").select("*").eq("published", true).order("created_at", { ascending: false }).limit(3);
    rows = data || [];
  }
  if (!rows.length) return null;

  return (
    <section className="wrap" style={{ paddingBlock: "10px 30px" }}>
      <div className="sec-head">
        <div><h2>{t("news_h")}</h2><p>{t("news_strip_p")}</p></div>
        <Link className="btn btn-ghost" href="/news">{t("news_all")}</Link>
      </div>
      <div className="news-grid">
        {rows.map((n) => (
          <Link key={n.id} href={`/news/${n.id}`} className="news-card">
            {n.image && <div className="news-img"><img src={n.image} alt={newsField(n, "title", lang)} /></div>}
            <div className="news-body">
              <div className="news-date">{fmtDate(n.created_at, lang)}</div>
              <h3 className="news-title">{newsField(n, "title", lang)}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
