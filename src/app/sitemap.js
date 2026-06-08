import { getBuildingsList } from "@/data/source";
import { supa } from "@/lib/supabase";

const BASE = "https://bayluxhome.com";

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
    { url: `${BASE}/novostroyki-batumi`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/property-management`, lastModified: now, priority: 0.8 },
    { url: `${BASE}/cleaning`, lastModified: now, priority: 0.5 },
    { url: `${BASE}/realtors`, lastModified: now, priority: 0.6 },
    { url: `${BASE}/news`, lastModified: now, priority: 0.6 },
  ];
  if (supa) {
    try {
      const { data } = await supa.from("news").select("id,created_at").eq("published", true);
      for (const n of data || []) urls.push({ url: `${BASE}/news/${n.id}`, lastModified: new Date(n.created_at), priority: 0.5 });
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
