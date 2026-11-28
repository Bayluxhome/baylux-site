// Единый список типов заявок для аналитики и раздела «Заявки» (T-20261128-02):
// аренда / продажа / посуточно / другое. Раньше аналитика считала по leads.type —
// подписи на языке посетителя («Rent», «Аренда», «ქირა»), и один тип дробился на три строки.
// Порядок: машинный type_key → текст типа (старые заявки без type_key) → «другое».
export const LEAD_KINDS = ["rent", "sale", "daily", "other"];

const RE = {
  daily: /посуточ|сутки|daily|night|დღიურ/i,
  rent: /аренд|снять|rent|ქირა/i,
  sale: /продаж|купить|покуп|sale|buy|გაყიდვ|ყიდვ/i,
};

export function leadKind(l) {
  const k = String(l?.type_key || "");
  if (k === "rent") return "rent";
  if (k === "daily") return "daily";
  const text = String(l?.type || "");
  if (RE.daily.test(text)) return "daily";
  if (RE.rent.test(text)) return "rent";
  if (RE.sale.test(text)) return "sale";
  return "other";
}

// Тестовая заявка: проверки безопасности (source sectest), тип test, пометка «ТЕСТ» в имени/комментарии.
export function isTestLead(l) {
  if (/test/i.test(String(l?.source || "")) || /^test$/i.test(String(l?.type || "")) || /^test$/i.test(String(l?.type_key || ""))) return true;
  return /^\s*(тест|test)\b/i.test(String(l?.name || "")) || /^\s*(\[[^\]]*\]\s*)?(тест|test)\b/i.test(String(l?.comment || ""));
}

// Откуда заявка: чат Tati / тест / сайт (формы, карточки, подборки).
export function leadOrigin(l) {
  if (isTestLead(l)) return "test";
  if (String(l?.source || "") === "chat") return "chat";
  return "site";
}
