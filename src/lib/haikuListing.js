// T-20261118-04 (18.11.2026): Claude Haiku для объявлений — доредакция перед загрузкой и проверка текста для автомодерации.
// Claude API напрямую (без SDK), ключ только из process.env.ANTHROPIC_API_KEY. Нет ключа/ошибка → { ok:false }:
// вызывающий код в этом случае НИЧЕГО не меняет (доредакция пропускается, автомодерация считает объявление спорным).
const API = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.HAIKU_LISTING_MODEL || "claude-haiku-5-5";
const TIMEOUT_MS = 20000;

// Флаги, которые может вернуть модель. Любой флаг → объявление «спорное» (на человека).
export const AI_FLAG_RU = {
  field_conflict: "поля противоречат тексту",
  foreign_contacts: "чужие контакты/агентство в тексте",
  agent_as_owner: "похоже на агента под видом собственника",
  unreal_price: "нереальная цена",
  junk: "мусор/не объявление о недвижимости",
  foreign_brand: "упоминание чужого агентства/водяного знака",
  ai_error: "ИИ-проверка текста не сработала",
};
const FLAGS = Object.keys(AI_FLAG_RU).filter((f) => f !== "ai_error");

const SYSTEM = `You are an editor and moderator for Baylux Home, a real-estate listings site in Georgia (Batumi, Tbilisi).
You receive one listing as JSON (fields + free text "about"). Reply with ONE JSON object only, no prose, no markdown:
{"fixes": {...}, "flags": [...], "note": "..."}
"fixes" — only fields you are confident need correction, any of:
  "about": the description rewritten in Russian: fix typos and grammar, keep all facts, remove phone numbers, @usernames, links, hashtags,
           names of other agencies and calls like "write in DM"; no emojis spam; max 1200 chars. Never invent facts.
  "address": street address in Russian, uniform style "улица <Name> <number>" / "проспект ..." (Georgian/Latin names → Russian spelling).
  "rooms" (int, total rooms; studio = 1), "area" (int m²), "floor" (string like "5/12"), "price_num" (int), "currency" ("USD" or "GEL").
  Change a numeric field only if the text clearly states a different value.
"flags" — zero or more of: ${FLAGS.join(", ")}.
  field_conflict: fields contradict the text and you cannot resolve it confidently;
  foreign_contacts: text contains other people's contacts or agency names that cannot be removed cleanly;
  agent_as_owner: signs of an agent posing as owner ("без комиссии" while clearly an agency, many objects listed, "подберём");
  unreal_price: price is implausible for the deal/city/area (e.g. sale of 100 m² for $500, rent $15000/month for a studio);
  junk: not a real-estate offer, spam, request "сниму/куплю", mostly emojis;
  foreign_brand: mentions of another agency's brand/watermark/logo.
"note" — short reason in Russian (<=150 chars), empty if nothing.`;

async function callHaiku(user, maxTokens = 900) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "no_key" };
  let lastErr = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: "user", content: user }] }),
        signal: ctrl.signal,
      });
      if (r.ok) {
        const j = await r.json();
        const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        const m = text.match(/\{[\s\S]*\}/);
        if (!m) return { ok: false, error: "no_json" };
        return { ok: true, data: JSON.parse(m[0]), usage: j.usage || null };
      }
      lastErr = `anthropic ${r.status}`;
      if (![408, 409, 429, 500, 502, 503, 504, 529].includes(r.status)) break;
    } catch (e) {
      lastErr = e?.name === "AbortError" ? "timeout" : String(e?.message || e);
    } finally { clearTimeout(timer); }
    if (attempt === 0) await new Promise((res) => setTimeout(res, 1500));
  }
  return { ok: false, error: lastErr || "error" };
}

const toInt = (v) => { const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10); return Number.isFinite(n) && n > 0 ? n : null; };

// Нормализуем ответ модели: только разрешённые поля и флаги, с проверкой типов.
function sanitize(data) {
  const f = (data && typeof data.fixes === "object" && data.fixes) || {};
  const fixes = {};
  if (typeof f.about === "string" && f.about.trim().length >= 20) fixes.about = f.about.trim().slice(0, 1500);
  if (typeof f.address === "string" && f.address.trim().length >= 3) fixes.address = f.address.trim().slice(0, 160);
  for (const k of ["rooms", "area", "price_num"]) { const n = toInt(f[k]); if (n) fixes[k] = n; }
  if (typeof f.floor === "string" && /^\d{1,3}(\/\d{1,3})?$/.test(f.floor.trim())) fixes.floor = f.floor.trim();
  if (f.currency === "USD" || f.currency === "GEL") fixes.currency = f.currency;
  const flags = Array.isArray(data?.flags) ? [...new Set(data.flags.filter((x) => FLAGS.includes(x)))] : [];
  const note = typeof data?.note === "string" ? data.note.slice(0, 200) : "";
  return { fixes, flags, note };
}

// Строка таблицы парсинга / строка listings → компактный JSON для модели.
function brief(r) {
  return JSON.stringify({
    deal: r.deal, type: r.type, city: r.city || r.district, address: r.address || r.building_name,
    complex: r.complex || "", price: r.price_num ?? r.price, currency: r.currency, area: r.area, rooms: r.rooms,
    floor: r.floor, no_commission: !!r.no_commission, about: String(r.about || "").slice(0, 3000),
  });
}

// Доредакция строки ДО вставки (bulk-listing). Возвращает { ok, fixes, flags, note }.
export async function refineListing(r) {
  const res = await callHaiku(brief(r));
  if (!res.ok) return { ok: false, fixes: {}, flags: [], note: "", error: res.error };
  return { ok: true, ...sanitize(res.data) };
}

// Проверка текста уже сохранённого объявления (cron автомодерации). Правки не применяются — только флаги.
export async function reviewListingText(row) {
  const res = await callHaiku(brief(row), 500);
  if (!res.ok) return { ok: false, flags: ["ai_error"], note: res.error || "", fixes: {} };
  return { ok: true, ...sanitize(res.data) };
}

export const aiFlagsText = (flags) => (flags || []).map((f) => AI_FLAG_RU[f] || f).join("; ");
