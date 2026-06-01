import Link from "next/link";
import { notFound } from "next/navigation";
import { supa } from "@/lib/supabase";
import { getLang } from "@/lib/serverLang";
import { t as tr, newsField } from "@/lib/dict";

export const revalidate = 120;

async function getNews(id) {
  if (!supa) return null;
  const { data } = await supa.from("news").select("*").eq("id", id).maybeSingle();
  return data || null;
}

export async function generateMetadata({ params }) {
  const n = await getNews(params.id);
  if (!n) return { title: "Новость не найдена" };
  const lang = getLang();
  const title = newsField(n, "title", lang);
  const desc = newsField(n, "body", lang).slice(0, 160);
  return {
    title: `${title} — Baylux`,
    description: desc,
    alternates: { canonical: `/news/${n.id}` },
    openGraph: {
      title, description: desc, type: "article",
      images: [n.image ? (n.image.startsWith("http") ? n.image : `https://bayluxhome.com${n.image}`) : "https://bayluxhome.com/hero-batumi.jpg"],
    },
  };
}

function fmtDate(s, lang) {
  try { return new Date(s).toLocaleDateString(lang === "ka" ? "ka-GE" : lang === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return ""; }
}

export default async function NewsItemPage({ params }) {
  const n = await getNews(params.id);
  if (!n) notFound();
  const lang = getLang();
  const t = (k) => tr(lang, k);
  const title = newsField(n, "title", lang);
  const body = newsField(n, "body", lang);

  const ld = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    datePublished: n.created_at,
    image: n.image ? [n.image.startsWith("http") ? n.image : `https://bayluxhome.com${n.image}`] : ["https://bayluxhome.com/hero-batumi.jpg"],
    author: { "@type": "Organization", name: "Baylux" },
    publisher: { "@type": "Organization", name: "Baylux", logo: { "@type": "ImageObject", url: "https://bayluxhome.com/baylux_logo.svg" } },
    mainEntityOfPage: `https://bayluxhome.com/news/${n.id}`,
  };

  return (
    <div className="wrap" style={{ paddingBlock: "30px 50px", maxWidth: 820 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="crumbs"><Link href="/">{t("crumb_home")}</Link> · <Link href="/news">{t("news_h")}</Link> · <span>{title}</span></div>
      <h1 style={{ color: "var(--navy)", marginTop: 10 }}>{title}</h1>
      <div style={{ color: "var(--ink-soft)", fontSize: 14, margin: "6px 0 18px" }}>{fmtDate(n.created_at, lang)}</div>
      {n.image && <img src={n.image} alt={title} style={{ width: "100%", borderRadius: 14, marginBottom: 20 }} />}
      <div style={{ color: "var(--ink)", lineHeight: 1.75, fontSize: 16, whiteSpace: "pre-line" }}>{body}</div>
      <div style={{ marginTop: 28 }}><Link className="btn btn-ghost" href="/news" style={{ padding: "9px 16px" }}>← {t("news_h")}</Link></div>
    </div>
  );
}
