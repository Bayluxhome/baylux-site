import Link from "next/link";
import { notFound } from "next/navigation";
import { ARTICLES, getArticle, articleField } from "@/data/articles";
import { getLang } from "@/lib/serverLang";
import { t as tr } from "@/lib/dict";

const SITE = "https://bayluxhome.com";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }) {
  const a = getArticle(params.slug);
  if (!a) return { title: "Статья — Baylux" };
  const lang = getLang();
  const title = articleField(a, "title", lang);
  const description = articleField(a, "excerpt", lang);
  return {
    title: `${title} — Baylux`,
    description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { title, description, type: "article", url: `${SITE}/blog/${a.slug}`, images: [a.image] },
  };
}

function fmtDate(s, lang) {
  try { return new Date(s).toLocaleDateString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default function ArticlePage({ params }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const title = articleField(a, "title", lang);
  const body = articleField(a, "body", lang);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: articleField(a, "excerpt", lang),
    datePublished: a.date,
    image: `${SITE}${a.image}`,
    author: { "@type": "Organization", name: "Baylux", url: SITE },
    publisher: { "@type": "Organization", name: "Baylux", logo: { "@type": "ImageObject", url: `${SITE}/baylux_logo.svg` } },
    mainEntityOfPage: `${SITE}/blog/${a.slug}`,
  };

  return (
    <div className="wrap" style={{ paddingBlock: "26px 50px", maxWidth: 820 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="crumbs"><Link href="/">{t("crumb_home")}</Link> · <Link href="/blog">{t("blog_h")}</Link> · <span>{title}</span></div>

      <h1 style={{ color: "var(--navy)", margin: "10px 0 6px", fontSize: "clamp(24px,3.4vw,34px)", lineHeight: 1.2 }}>{title}</h1>
      <div style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 18 }}>{fmtDate(a.date, lang)}</div>
      {a.image && <img src={a.image} alt={title} style={{ width: "100%", borderRadius: 14, marginBottom: 22, objectFit: "cover", maxHeight: 360 }} />}

      <div className="article-body" style={{ color: "var(--ink)", lineHeight: 1.75, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: body }} />

      <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn btn-ghost" href="/blog" style={{ padding: "9px 16px" }}>← {t("blog_h")}</Link>
        <Link className="btn btn-gold" href="/catalog" style={{ padding: "9px 16px" }}>{t("home_map_btn")}</Link>
      </div>
    </div>
  );
}
