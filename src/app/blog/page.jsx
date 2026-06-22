import Link from "next/link";
import { ARTICLES, articleField } from "@/data/articles";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

export const metadata = {
  title: "Статьи о недвижимости в Грузии и Батуми — Baylux",
  description: "Гид по аренде и покупке недвижимости в Батуми и Тбилиси: цены по районам, новостройки с инфраструктурой, посуточная аренда и доходность. Статьи от команды Baylux.",
  alternates: { canonical: "/blog" },
};

function fmtDate(s, lang) {
  try { return new Date(s).toLocaleDateString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default function BlogPage() {
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const items = [...ARTICLES].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px" }}>
      <h1 style={{ color: "var(--navy)" }}>{t("blog_h")}</h1>
      <p style={{ color: "var(--ink-soft)", margin: "8px 0 24px", lineHeight: 1.6, maxWidth: 720 }}>{t("blog_p")}</p>

      <div className="news-grid">
        {items.map((a) => (
          <Link key={a.slug} href={`/blog/${a.slug}`} className="news-card">
            {a.image && <div className="news-img"><img src={a.image} alt={articleField(a, "title", lang)} loading="lazy" /></div>}
            <div className="news-body">
              <div className="news-date">{fmtDate(a.date, lang)}</div>
              <h2 className="news-title">{articleField(a, "title", lang)}</h2>
              <p className="news-excerpt">{articleField(a, "excerpt", lang)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
