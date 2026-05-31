// Официальный курс USD→GEL с сайта Нацбанка Грузии (nbg.gov.ge). Кэш на 6 часов.
let cache = { rate: 2.7, ts: 0 };

export async function getUsdGel() {
  const now = Date.now();
  if (cache.ts && now - cache.ts < 6 * 3600 * 1000) return cache.rate;
  try {
    const r = await fetch("https://nbg.gov.ge/gw/api/ct/monetarypolicy/currencies/en/json/", { next: { revalidate: 21600 } });
    const j = await r.json();
    const arr = Array.isArray(j) ? (j[0] && j[0].currencies) : null;
    const usd = arr && arr.find((c) => c.code === "USD");
    if (usd && usd.rate) cache = { rate: usd.rate / (usd.quantity || 1), ts: now };
  } catch (e) {
    console.error("NBG rate fetch failed:", e && e.message);
  }
  return cache.rate;
}
