import { getBuildingsList } from "@/data/source";

const BASE = "https://bayluxhome.com";

export default async function sitemap() {
  const now = new Date();
  const BUILDINGS = await getBuildingsList();
  const urls = [
    { url: BASE, lastModified: now, priority: 1 },
    { url: `${BASE}/catalog`, lastModified: now, priority: 0.9 },
  ];
  for (const b of BUILDINGS) {
    urls.push({ url: `${BASE}/building/${b.slug}`, lastModified: now, priority: 0.8 });
    for (const u of b.units) {
      urls.push({ url: `${BASE}/property/${u.slug}`, lastModified: now, priority: 0.7 });
    }
  }
  return urls;
}
