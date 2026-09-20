import { getBuildingsList } from "@/data/source";
import { supa } from "@/lib/supabase";
import { ARTICLES } from "@/data/articles";
import { SITE_URL } from "@/config";

const BASE = SITE_URL;

export default async function sitemap() {
  const now = new Date();
  const BUILDINGS = await getBuildingsList();
  const urls = [
    { url: BASE, lastModified: now, priority: 1 },
    { url: `${BASE}/catalog`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/arenda-batumi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/kupit-kvartiru-batumi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/apartamenty-batumi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/posutochno-batumi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/novostroyki`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/novostroyki-batumi`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/kupit-kvartiru-tbilisi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/arenda-tbilisi`, lastModified: now, priority: 0.9 },
    { url: `${BASE}/posutochno-tbilisi`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/property-management`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/cleaning`, lastModified: now, priority: 0.5 },
    { url: `${BASE}/realtors`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/news`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/blog`, lastModified: now, priority: 0.7 },
  ];
  for (const a of ARTICLES) {
    urls.push({ url: `${BASE}/blog/${a.slug}`, lastModified: new Date(a.date), priority: 0.6 });
  }
  if (supa) {
    try {
      const { data } = await supa.from("news").select("id,created_at").eq("published", true);
      for (const n of data || []) urls.push({ url: `${BASE}/news/${n.id}`, lastModified: new Date(n.created_at), priority: 0.5 });
      // Новостройки — только опубликованные ЖК
      const { data: cx } = await supa.from("complexes").select("slug, updated_at").eq("status", "published");
      for (const c of cx || []) urls.push({ url: `${BASE}/novostroyki/${c.slug}`, lastModified: new Date(c.updated_at || now), priority: 0.8 });
    } catch (e) { /* ignore */ }
  }
  for (const b of BUILDINGS) {
    urls.push({ url: `${BASE}/building/${b.slug}`, lastModified: now, priority: 0.8 });
    for (const u of b.units) {
      urls.push({ url: `${BASE}/property/${u.slug}`, lastModified: now, priority: 0.7 });
    }
  }
  return urls;
}
