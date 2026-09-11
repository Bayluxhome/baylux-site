// Географический справочник и проверки координат (задача: карта и неверное местоположение).
// Центры городов — публичные координаты (OSM/Wikipedia), округлены до ~100 м; служат ТОЛЬКО для
// проверки «точка не в том городе» и для стартового центра карты, не как координаты объектов.

export const GE_BBOX = { latMin: 41.0, latMax: 43.6, lngMin: 39.9, lngMax: 46.8 };

export const CITY_CENTER = {
  "Батуми": [41.6168, 41.6367], "Тбилиси": [41.7151, 44.8271], "Кобулети": [41.8200, 41.7770],
  "Гонио": [41.5700, 41.5730], "Чакви": [41.7230, 41.7350], "Махинджаури": [41.6740, 41.6980],
  "Кутаиси": [42.2662, 42.7180], "Рустави": [41.5495, 44.9932], "Бакуриани": [41.7500, 43.5290],
  "Гудаури": [42.4780, 44.4780], "Местиа": [43.0450, 42.7280], "Сарпи": [41.5220, 41.5500],
  "Квариати": [41.5400, 41.5600], "Уреки": [41.9950, 41.7800], "Поти": [42.1460, 41.6720],
  "Зугдиди": [42.5088, 41.8709], "Мцхета": [41.8450, 44.7190], "Гори": [41.9840, 44.1120],
  "Телави": [41.9190, 45.4730], "Боржоми": [41.8400, 43.3790], "Сигнахи": [41.6180, 45.9210],
  "Озургети": [41.9250, 41.9950], "Самтредиа": [42.1530, 42.3380], "Сенаки": [42.2700, 42.0680],
  "Зестафони": [42.1090, 43.0480], "Цхалтубо": [42.3220, 42.5980], "Хашури": [41.9950, 43.5990],
  "Марнеули": [41.4740, 44.8100], "Ахалцихе": [41.6390, 42.9860],
};

// Технические точки-заглушки, которые встречались в коде как «координаты по умолчанию».
// Объект ровно в такой точке почти наверняка не геокодирован.
const FALLBACKS = [[41.64, 41.63], [41.645, 41.642], [41.636, 41.641], [41.642, 41.632], [41.6168, 41.6367], [41.7151, 44.8271]];

export const CITY_RADIUS_KM = 30; // порог «точка не соответствует городу» (с запасом на пригороды)

export function toNum(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

export function inGeorgia(lat, lng) {
  return isValidCoord(lat, lng) && lat >= GE_BBOX.latMin && lat <= GE_BBOX.latMax && lng >= GE_BBOX.lngMin && lng <= GE_BBOX.lngMax;
}

export function isFallbackCoord(lat, lng) {
  return FALLBACKS.some(([a, b]) => Math.abs(a - lat) < 1e-4 && Math.abs(b - lng) < 1e-4);
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1), dLng = toR(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Расстояние от точки до центра заявленного города; null — город не в справочнике.
export function distToCity(city, lat, lng) {
  const c = CITY_CENTER[String(city || "").trim()];
  return c ? distanceKm(lat, lng, c[0], c[1]) : null;
}

// Полная оценка координат объекта → { ok, reason }.
// reasons: missing | invalid | outside_ge | fallback | swapped? | city_mismatch
export function assessCoords(row) {
  const lat = toNum(row.lat), lng = toNum(row.lng);
  if (lat == null || lng == null) return { ok: false, reason: "missing" };
  if (!isValidCoord(lat, lng)) return { ok: false, reason: "invalid" };
  if (!inGeorgia(lat, lng)) {
    // Перепутанные lat/lng: после обмена точка попадает в Грузию.
    if (inGeorgia(lng, lat)) return { ok: false, reason: "swapped?" };
    return { ok: false, reason: "outside_ge" };
  }
  if (isFallbackCoord(lat, lng)) return { ok: false, reason: "fallback" };
  const d = distToCity(row.district, lat, lng);
  if (d != null && d > CITY_RADIUS_KM) return { ok: false, reason: "city_mismatch", km: Math.round(d) };
  return { ok: true, lat, lng, km: d == null ? null : Math.round(d) };
}
