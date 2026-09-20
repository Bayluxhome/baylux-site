import { getBuildingsList } from "@/data/source";
import { supa } from "@/lib/supabase";
import { ARTICLES } from "@/data/articles";
import { SITE_URL } from "@/config";
import { LANGS, withLang } from "@/lib/i18nPath";

const BASE = SITE_URL;

// Каждая страница — в трёх языковых версиях (/ru, /en, /ka) с перекрёстными alternates:
// так Google получает hreflang и через sitemap, а не только из <head>.
function entry(path, lastModified, priority) {
  const languages = Object.fromEntries(LANGS.map((l) => [l, `${BASE}${withLang(l, path)}`]));
  return LANGS.map((l) => ({ url: `${BASE}${withLang(l, path)}`, lastModified, priority, alternates: { languages } }));
}

export default async function sitemap() {
  const now = new Date();
  const BUILDINGS = await getBuildingsList();
  const urls = [
    ...entry("/", now, 1),
    ...entry("/catalog", now, 0.9),
    ...entry("/catalog?deal=sale", now, 0.9),
    ...entry("/catalog?deal=rent", now, 0.9),
    ...entry("/catalog?deal=daily", now, 0.8),
    ...entry("/arenda-batumi", now, 0.9),
    ...entry("/kupit-kvartiru-batumi", now, 0.9),
    ...entry("/apartamenty-batumi", now, 0.9),
    ...entry("/posutochno-batumi", now, 0.9),
    ...entry("/novostroyki", now, 0.9),
    ...entry("/novostroyki-batumi", now, 0.8),
    ...entry("/kupit-kvartiru-tbilisi", now, 0.9),
    ...entry("/arenda-tbilisi", now, 0.9),
    ...entry("/posutochno-tbilisi", now, 0.8),
    ...entry("/property-management", now, 0.8),
    ...entry("/cleaning", now, 0.5),
    ...entry("/realtors", now, 0.6),
    ...entry("/about", now, 0.5),
    ...entry("/contacts", now, 0.5),
    ...entry("/news", now, 0.6),
    ...entry("/blog", now, 0.7),
  ];
  for (const a of ARTICLES) urls.push(...entry(`/blog/${a.slug}`, new Date(a.date), 0.6));
  if (supa) {
    try {
      const { data } = await supa.from("news").select("id,created_at").eq("published", true);
      for (const n of data || []) urls.push(...entry(`/news/${n.id}`, new Date(n.created_at), 0.5));
      // Новостройки — только опубликованные ЖК
      const { data: cx } = await supa.from("complexes").select("slug, updated_at").eq("status", "published");
      for (const c of cx || []) urls.push(...entry(`/novostroyki/${c.slug}`, new Date(c.updated_at || now), 0.8));
    } catch (e) { /* ignore */ }
  }
  for (const b of BUILDINGS) {
    urls.push(...entry(`/building/${b.slug}`, now, 0.8));
    for (const u of b.units) urls.push(...entry(`/property/${u.slug}`, now, 0.7));
  }
  return urls;
}
