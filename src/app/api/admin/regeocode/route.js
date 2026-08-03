import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { translitAddress } from "@/lib/dict";
import { cleanAddress } from "@/data/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Латинские имена городов для геокодера (MapTiler плохо понимает кириллицу).
const CITY_LAT = {
  "Батуми": "Batumi", "Тбилиси": "Tbilisi", "Кобулети": "Kobuleti", "Гонио": "Gonio",
  "Чакви": "Chakvi", "Кутаиси": "Kutaisi", "Рустави": "Rustavi", "Бакуриани": "Bakuriani",
  "Гудаури": "Gudauri", "Местиа": "Mestia", "Махинджаури": "Makhinjauri",
};

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

async function geocode(q) {
  if (!KEY) return null;
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${KEY}&limit=1&country=ge`);
    const j = await r.json();
    const c = j?.features?.[0]?.center;
    if (Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])) return { lat: c[1], lng: c[0] };
  } catch (e) { /* ignore */ }
  return null;
}

async function fetchAll() {
  const all = [];
  const PAGE = 1000;
  for (let p = 0; p < 6; p++) {
    const { data, error } = await supa
      .from("listings")
      .select("id, building_name, name_ru, district, kind, lat, lng")
      .eq("status", "approved")
      .order("id", { ascending: true })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !data || !data.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  return all;
}

const ptKey = (r) => (r.lat == null || r.lng == null ? "null" : `${Number(r.lat).toFixed(4)},${Number(r.lng).toFixed(4)}`);

// Пересчёт координат по адресу с транслитерацией в латиницу.
// GET  → dry-run: НИЧЕГО не пишет; показывает кластеры и примеры новых координат (безопасно).
// POST ?live=1 → пишет lat/lng и geo_ok=true ТОЛЬКО там, где геокодинг успешен.
// Трогаем ТОЛЬКО объекты в крупных кластерах (одинаковые координаты у >= min объектов) или без координат —
// объекты с уникальными точками (точные/ручные) не трогаем. При неудаче ничего не перезатираем, не удаляем.
async function run(req, write) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa || !KEY) return Response.json({ ok: false, error: "not_configured" });

  const url = new URL(req.url);
  const live = write && url.searchParams.get("live") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "60", 10) || 60, 150);
  const minCluster = Math.max(2, parseInt(url.searchParams.get("min") || "4", 10) || 4);

  const all = await fetchAll();
  const freq = {};
  for (const r of all) freq[ptKey(r)] = (freq[ptKey(r)] || 0) + 1;
  const topClusters = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([point, count]) => ({ point, count }));

  // Цели: объекты без координат ИЛИ в крупном кластере.
  const targetsAll = all.filter((r) => ptKey(r) === "null" || freq[ptKey(r)] >= minCluster);
  const targets = targetsAll.slice(0, limit);

  const samples = [];
  let geocoded = 0, updated = 0;
  const CONC = 6;
  for (let i = 0; i < targets.length; i += CONC) {
    const chunk = targets.slice(i, i + CONC);
    const res = await Promise.all(chunk.map(async (r) => {
      const addrRu = cleanAddress(r.building_name || r.name_ru || "");
      if (!addrRu) return null;
      const addrLat = translitAddress(addrRu, "en", r.kind);
      const city = CITY_LAT[r.district] || r.district || "Batumi";
      const query = `${addrLat}, ${city}, Georgia`;
      const g = await geocode(query);
      return { r, addrRu, query, g, cur: ptKey(r) };
    }));
    for (const x of res) {
      if (!x || !x.g) continue;
      geocoded++;
      if (samples.length < 15) samples.push({ id: x.r.id, from: x.addrRu, curPoint: x.cur, newLat: Number(x.g.lat.toFixed(5)), newLng: Number(x.g.lng.toFixed(5)) });
      if (live) { await supa.from("listings").update({ lat: x.g.lat, lng: x.g.lng, geo_ok: true }).eq("id", x.r.id); updated++; }
    }
  }
  return Response.json({
    ok: true,
    mode: live ? "LIVE (записано)" : "dry-run (ничего не записано)",
    totalApproved: all.length,
    distinctPoints: Object.keys(freq).length,
    topClusters,
    targetsTotal: targetsAll.length,
    processedThisCall: targets.length,
    geocoded,
    updated,
    samples,
  });
}

export async function GET(req) { return run(req, false); }
export async function POST(req) { return run(req, true); }
