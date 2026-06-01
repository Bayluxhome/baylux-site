import Link from "next/link";
import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr, newsField } from "@/lib/dict";

export const revalidate = 120;
export const metadata = {
  title: "Новости Baylux — недвижимость в Батуми и Грузии",
  description: "Новости агентства Baylux: новые проекты и новостройки, обновления сервиса, открытие офисов и выход на новые рынки в Грузии.",
  alternates: { canonical: "/news" },
};

function fmtDate(s, lang) {
  try { return new Date(s).toLocaleDateString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default async function NewsPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  let rows = [];
  if (supa) {
    const { data } = await supa.from("news").select("*").eq("published", true).order("created_at", { ascending: false });
    rows = data || [];
  }

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("news_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 24px", lineHeight: 1.6, maxWidth: 720 }}>{t("news_p")}</p>

      {rows.length === 0 ? (
        <p style={{ color: "var(--ink-soft)" }}>{t("news_empty")}</p>
      ) : (
        <div className="news-grid">
          {rows.map((n) => (
            <Link key={n.id} href={`/news/${n.id}`} className="news-card">
              {n.image && <div className="news-img"><img src={n.image} alt={newsField(n, "title", lang)} /></div>}
              <div className="news-body">
                <div className="news-date">{fmtDate(n.created_at, lang)}</div>
                <h2 className="news-title">{newsField(n, "title", lang)}</h2>
                <p className="news-excerpt">{newsField(n, "body", lang).slice(0, 140)}…</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
