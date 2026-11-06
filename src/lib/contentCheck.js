// 06.11.2026: автопроверка содержимого объявления перед мгновенной публикацией.
// Фото — Google Cloud Vision (SafeSearch: обнажёнка/насилие + метки: «это недвижимость?»).
// Текст — простые стоп-слова и ссылки. Любое подозрение → объявление уходит модератору (не публикуется).
// Ключ: GOOGLE_VISION_API_KEY, иначе GOOGLE_TRANSLATE_API_KEY (в Google Cloud должен быть включён Cloud Vision API).
const KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;
const BAD = ["LIKELY", "VERY_LIKELY"];

// Метки Vision, по которым фото считаем «про недвижимость» (подстрока, нижний регистр).
const PROPERTY_WORDS = ["room", "interior", "building", "apartment", "floor", "property", "real estate", "estate", "house", "home",
  "furniture", "kitchen", "bed", "bath", "window", "wall", "ceiling", "condominium", "tower", "facade", "façade", "architecture",
  "sea", "beach", "balcony", "plumbing", "tile", "couch", "sofa", "table", "countertop", "cabinet", "residential", "city", "urban",
  "sky", "land", "commercial", "door", "wood", "lighting", "hall", "stair", "roof", "yard", "garden", "pool", "skyscraper", "hotel",
  "studio", "closet", "wardrobe", "sink", "toilet", "shower", "mirror", "curtain", "fixture", "appliance", "living", "office",
  "construction", "concrete", "mountain", "tree", "street", "neighbourhood", "neighborhood", "plan", "map"];

const BAD_TEXT = /(https?:\/\/|www\.|t\.me\/|хуй|хуе|пизд|ебат|ебал|ёбан|ебан|бляд|сука|мудак|гандон|шлюх|проститут|порн|интим|эскорт|\bfuck|\bporn|escort|nude|\bsex\b|სექს)/i;

export function textVerdict(...texts) {
  const s = texts.filter(Boolean).join("\n");
  return BAD_TEXT.test(s) ? ["bad_text"] : [];
}

async function toB64(url) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    return Buffer.from(await r.arrayBuffer()).toString("base64");
  } finally { clearTimeout(tm); }
}

// Возвращает массив причин: [] — всё чисто; "nsfw" | "not_property" | "ai_error".
export async function photoVerdict(photos) {
  const list = (Array.isArray(photos) ? photos : []).filter(Boolean).slice(0, 10);
  if (!list.length) return [];
  if (!KEY) return ["ai_error"];
  try {
    const imgs = await Promise.all(list.map((u) => toB64(u).catch(() => null)));
    const requests = imgs.filter(Boolean).map((content) => ({
      image: { content },
      features: [{ type: "SAFE_SEARCH_DETECTION" }, { type: "LABEL_DETECTION", maxResults: 15 }],
    }));
    if (!requests.length) return ["ai_error"];
    const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${KEY}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests }),
    });
    const j = await r.json();
    if (!r.ok || !Array.isArray(j.responses)) { console.error("vision:", j?.error?.message || r.status); return ["ai_error"]; }
    const reasons = new Set();
    let propertyCount = 0, checked = 0;
    for (const resp of j.responses) {
      if (resp.error) { reasons.add("ai_error"); continue; }
      checked++;
      const ss = resp.safeSearchAnnotation || {};
      if (BAD.includes(ss.adult) || BAD.includes(ss.violence) || ss.racy === "VERY_LIKELY") reasons.add("nsfw");
      const labels = (resp.labelAnnotations || []).map((l) => String(l.description || "").toLowerCase());
      if (labels.some((l) => PROPERTY_WORDS.some((w) => l.includes(w)))) propertyCount++;
    }
    if (checked && propertyCount < Math.ceil(checked / 2)) reasons.add("not_property");
    return [...reasons];
  } catch (e) {
    console.error("vision check:", e?.message);
    return ["ai_error"];
  }
}
