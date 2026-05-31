// Автоперевод через Google Cloud Translation v2 (REST + API-ключ).
// Бесплатно до 500 000 символов/мес. Если ключа нет — тихо ничего не делаем.
const KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const LANGS = ["ru", "en", "ka"];

export async function translateText(text, target, source) {
  if (!KEY || !text || !text.trim() || source === target) return null;
  try {
    const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, target, source, format: "text" }),
    });
    const j = await r.json();
    return j?.data?.translations?.[0]?.translatedText || null;
  } catch (e) {
    console.error("translate error:", e?.message);
    return null;
  }
}

// Универсально: { <prefix>ru, <prefix>en, <prefix>ka } — оригинал + переводы на остальные языки.
async function translateToAll(text, sourceLang, prefix) {
  const src = LANGS.includes(sourceLang) ? sourceLang : "ru";
  const out = { [prefix + src]: text || "" };
  if (!text || !text.trim()) return out;
  for (const l of LANGS) {
    if (l === src) continue;
    const t = await translateText(text, l, src);
    if (t) out[prefix + l] = t;
  }
  return out;
}

// Описание объявления → desc_ru/desc_en/desc_ka.
export async function translateDescriptions(about, sourceLang) {
  return translateToAll(about, sourceLang, "desc_");
}

// Адрес/название (улица) → name_ru/name_en/name_ka. ЖК (бренд) не переводим отдельно.
export async function translateNames(name, sourceLang) {
  return translateToAll(name, sourceLang, "name_");
}
