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

// Пересчёт координат по адресу с транслитерацией в латиницу.
// GET  → dry-run: НИЧЕГО не пишет, только показывает, сколько и что нашлось (безопасно).
// POST ?live=1 → пишет lat/lng и geo_ok=true ТОЛЬКО там, где геокодинг успешен. Ничего не удаляет и не перезатирает при неудаче.
// По умолчанию берём только geo_ok=false (провалившиеся пачки), чтобы не трогать вручную поставленные точки.
async function run(req, write) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!isSuperAdmin(session)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  if (!supa || !KEY) return Response.json({ ok: false, error: "not_configured" });

  const url = new URL(req.url);
  const live = write && url.searchParams.get("live") === "1";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "40", 10) || 40, 120);
  const includeNull = url.searchParams.get("includeNull") === "1";

  let q = supa.from("listings").select("id, building_name, name_ru, district, kind, lat, lng, geo_ok").eq("status", "approved");
  q = includeNull ? q.or("geo_ok.is.null,geo_ok.eq.false") : q.eq("geo_ok", false);
  const { data, error } = await q.limit(limit);
  if (error) return Response.json({ ok: false, error: error.message });

  const rows = data || [];
  const samples = [];
  let geocoded = 0, updated = 0;
  const CONC = 6;
  for (let i = 0; i < rows.length; i += CONC) {
    const chunk = rows.slice(i, i + CONC);
    const results = await Promise.all(chunk.map(async (r) => {
      const addrRu = cleanAddress(r.building_name || r.name_ru || "");
      if (!addrRu) return null;
      const addrLat = translitAddress(addrRu, "en", r.kind);
      const city = CITY_LAT[r.district] || r.district || "Batumi";
      const query = `${addrLat}, ${city}, Georgia`;
      const g = await geocode(query);
      return { r, addrRu, query, g };
    }));
    for (const res of results) {
      if (!res || !res.g) continue;
      geocoded++;
      if (samples.length < 15) samples.push({ id: res.r.id, from: res.addrRu, query: res.query, lat: res.g.lat, lng: res.g.lng });
      if (live) { await supa.from("listings").update({ lat: res.g.lat, lng: res.g.lng, geo_ok: true }).eq("id", res.r.id); updated++; }
    }
  }
  return Response.json({ ok: true, mode: live ? "LIVE (записано)" : "dry-run (ничего не записано)", scanned: rows.length, geocoded, updated, samples });
}

export async function GET(req) { return run(req, false); }
export async function POST(req) { return run(req, true); }
