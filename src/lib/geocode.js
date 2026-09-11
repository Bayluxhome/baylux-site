// Геокодирование адреса с обязательным городом и проверкой результата (задача: неверное местоположение).
// Причина прошлых ошибок: MapTiler на «Шартава, Batumi, Georgia» возвращал улицу Шартава в Рустави,
// а результат принимался без проверки. Теперь: подсказка proximity = центр города, берём до 5 кандидатов
// и принимаем первый, который лежит в пределах CITY_RADIUS_KM от центра заявленного города.
// Город не в справочнике → принимаем только точку внутри Грузии. Ничего не найдено → null (без фолбэка).
import { CITY_CENTER, CITY_RADIUS_KM, distanceKm, inGeorgia } from "@/lib/geo";
import { cityLabel } from "@/lib/dict";

const KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

// address — строка адреса (лучше латиницей), cityRu — город из справочника (ключ CITY_TR / CITY_CENTER).
// Возвращает { lat, lng, km, placeName } либо null.
export async function geocodeInCity(address, cityRu) {
  if (!KEY) return null;
  const city = String(cityRu || "").trim();
  const center = CITY_CENTER[city] || null;
  const cityEn = cityLabel("en", city) || city;
  const q = [String(address || "").trim(), cityEn, "Georgia"].filter(Boolean).join(", ");
  const params = new URLSearchParams({ key: KEY, limit: "5", country: "ge", language: "en" });
  if (center) params.set("proximity", `${center[1]},${center[0]}`);
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${params}`);
    const j = await r.json();
    for (const f of j?.features || []) {
      const c = f?.center;
      if (!Array.isArray(c) || c.length !== 2) continue;
      // Точность: принимаем только адрес/улицу/POI/квартал. Результат уровня «город/район/регион»
      // означает, что улица не найдена — такую точку (центр города) выдавать за адрес нельзя.
      const types = Array.isArray(f.place_type) ? f.place_type : [];
      if (types.length && !types.some((x) => /address|street|poi|neighbourhood|locality|place\.suburb|road/i.test(x))) continue;
      const lat = Number(c[1]), lng = Number(c[0]);
      if (!inGeorgia(lat, lng)) continue;
      if (!center) return { lat, lng, km: null, placeName: f.place_name || "", type: types[0] || "" };
      const km = distanceKm(lat, lng, center[0], center[1]);
      if (km <= CITY_RADIUS_KM) return { lat, lng, km: Math.round(km), placeName: f.place_name || "", type: types[0] || "" };
    }
  } catch (e) { console.error("geocode error:", e?.message); }
  return null;
}
