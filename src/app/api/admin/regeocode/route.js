import { cookies } from "next/headers";
import { verifySession, isSuperAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { translitAddress } from "@/lib/dict";
import { cleanAddress } from "@/data/sheet";
import { revalidateListings } from "@/lib/cache";
import { geocodeInCity } from "@/lib/geocode";
import { assessCoords } from "@/lib/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

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

  // Цели: без координат, в крупном кластере ИЛИ с точкой не в своём городе (assessCoords: city_mismatch,
  // outside_ge, fallback, swapped?). Ручные точки (уникальные и в своём городе) не трогаем.
  const badReason = (r) => { const a = assessCoords(r); return a.ok ? "" : a.reason; };
  const targetsAll = all.filter((r) => ptKey(r) === "null" || freq[ptKey(r)] >= minCluster || badReason(r));
  const targets = targetsAll.slice(0, limit);

  const samples = [];
  let geocoded = 0, updated = 0, notFound = 0, cleared = 0;
  const CONC = 6;
  for (let i = 0; i < targets.length; i += CONC) {
    const chunk = targets.slice(i, i + CONC);
    const res = await Promise.all(chunk.map(async (r) => {
      const addrRu = cleanAddress(r.building_name || r.name_ru || "");
      if (!addrRu) return null;
      const addrLat = translitAddress(addrRu, "en", r.kind);
      // Геокодер с проверкой: точка принимается только в радиусе заявленного города.
      const g = await geocodeInCity(addrLat, r.district || "Батуми");
      return { r, addrRu, g, cur: ptKey(r), reason: badReason(r) };
    }));
    for (const x of res) {
      if (!x) continue;
      if (x.g) {
        geocoded++;
        if (samples.length < 15) samples.push({ id: x.r.id, from: x.addrRu, city: x.r.district, reason: x.reason || "cluster/null", curPoint: x.cur, newLat: Number(x.g.lat.toFixed(5)), newLng: Number(x.g.lng.toFixed(5)), km: x.g.km });
        if (live) { await supa.from("listings").update({ lat: x.g.lat, lng: x.g.lng, geo_ok: true }).eq("id", x.r.id); updated++; }
      } else {
        notFound++;
        // Точка была заведомо неверной (чужой город) и заново не нашлась → обнуляем, чтобы объект
        // не висел в чужом городе; он остаётся в каталоге без пина (модератор поставит вручную).
        if (x.reason && x.cur !== "null") {
          if (samples.length < 15) samples.push({ id: x.r.id, from: x.addrRu, city: x.r.district, reason: x.reason, curPoint: x.cur, action: "clear" });
          if (live) { await supa.from("listings").update({ lat: null, lng: null, geo_ok: false }).eq("id", x.r.id); cleared++; }
        }
      }
    }
  }
  if (live && updated > 0) revalidateListings();
  return Response.json({
    ok: true,
    mode: live ? "LIVE (записано)" : "dry-run (ничего не записано)",
    totalApproved: all.length,
    distinctPoints: Object.keys(freq).length,
    topClusters,
    targetsTotal: targetsAll.length,
    processedThisCall: targets.length,
    geocoded,
    notFound,
    updated,
    cleared,
    samples,
  });
}

export async function GET(req) { return run(req, false); }
export async function POST(req) { return run(req, true); }
