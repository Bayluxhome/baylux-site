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

// Возвращает { desc_ru, desc_en, desc_ka } — оригинал + переводы на остальные языки.
export async function translateDescriptions(about, sourceLang) {
  const src = LANGS.includes(sourceLang) ? sourceLang : "ru";
  const out = { ["desc_" + src]: about || "" };
  if (!about || !about.trim()) return out;
  for (const l of LANGS) {
    if (l === src) continue;
    const t = await translateText(about, l, src);
    if (t) out["desc_" + l] = t;
  }
  return out;
}
