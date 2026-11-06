// 06.11.2026: автопроверка содержимого объявления перед мгновенной публикацией.
// Фото — Google Cloud Vision (SafeSearch: обнажёнка/насилие + метки: «это недвижимость?»).
// Текст — простые стоп-слова и ссылки. Любое подозрение → объявление уходит модератору (не публикуется).
// Провайдер (06.11): если задан LAOZHANG_API_KEY — Gemini через LaoZhang (предоплата, ключ с лимитом),
// иначе Google Vision (GOOGLE_VISION_API_KEY / GOOGLE_TRANSLATE_API_KEY).
const KEY = process.env.GOOGLE_VISION_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;
const LZ_KEY = process.env.LAOZHANG_API_KEY;
const LZ_MODEL = process.env.LAOZHANG_MODERATION_MODEL || "gemini-2.5-flash";
let lastError = "";
export const contentCheckInfo = () => ({ provider: LZ_KEY ? "laozhang:" + LZ_MODEL : KEY ? "google-vision" : "none", lastError });
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

const LZ_PROMPT = `You moderate photos for a real estate listings website. For EACH image (in order, numbered from 1) decide:
- "nsfw": true if it shows nudity, sexual content, violence, gore, weapons aimed at people, drugs or hate symbols;
- "property": true if it is a photo/render/floor plan of real estate (apartment or house interior, building, facade, yard, view from a window, construction site, plot of land).
Answer ONLY with JSON: {"images":[{"i":1,"nsfw":false,"property":true}]}`;

async function laozhangVerdict(list) {
  const imgs = (await Promise.all(list.map((u) => toB64(u).catch(() => null)))).filter(Boolean);
  if (!imgs.length) { lastError = "photos not downloaded"; return ["ai_error"]; }
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch("https://api.laozhang.ai/v1/chat/completions", {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LZ_KEY}` },
      body: JSON.stringify({ model: LZ_MODEL, temperature: 0, messages: [{ role: "user", content: [
        { type: "text", text: LZ_PROMPT },
        ...imgs.map((b) => ({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${b}` } })),
      ] }] }),
    });
    const j = await r.json().catch(() => null);
    const text = j?.choices?.[0]?.message?.content;
    if (!r.ok || typeof text !== "string") { lastError = `laozhang ${r.status}: ${j?.error?.message || "no content"}`; console.error("moderation:", lastError); return ["ai_error"]; }
    const m = text.match(/\{[\s\S]*\}/);
    const arr = m ? JSON.parse(m[0]).images : null;
    if (!Array.isArray(arr) || !arr.length) { lastError = "bad answer: " + text.slice(0, 200); console.error("moderation:", lastError); return ["ai_error"]; }
    lastError = "";
    const reasons = new Set();
    if (arr.some((x) => x && x.nsfw === true)) reasons.add("nsfw");
    const prop = arr.filter((x) => x && x.property === true).length;
    if (prop < Math.ceil(arr.length / 2)) reasons.add("not_property");
    return [...reasons];
  } catch (e) {
    lastError = "laozhang: " + (e?.message || e); console.error("moderation:", lastError);
    return ["ai_error"];
  } finally { clearTimeout(tm); }
}

// Возвращает массив причин: [] — всё чисто; "nsfw" | "not_property" | "ai_error".
export async function photoVerdict(photos) {
  const list = (Array.isArray(photos) ? photos : []).filter(Boolean).slice(0, 10);
  if (!list.length) return [];
  if (LZ_KEY) return laozhangVerdict(list);
  if (!KEY) { lastError = "no key"; return ["ai_error"]; }
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
    if (!r.ok || !Array.isArray(j.responses)) { lastError = "vision: " + (j?.error?.message || r.status); console.error(lastError); return ["ai_error"]; }
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
