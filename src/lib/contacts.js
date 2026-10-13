// Контакты пользователя для объявлений (13.10.2026): общие нормализаторы телефона и Telegram.
// Без серверных импортов — используют и форма объявления/профиля (клиент), и API (сервер).

// Грузинский номер → «+995XXXXXXXXX». Пробелы, скобки, дефисы допускаются при вводе.
// 9 цифр без кода страны дополняем +995. Всё остальное — null (некорректный номер).
export function normPhone(raw) {
  const s = String(raw || "").replace(/[^\d+]/g, "");
  const d = s.replace(/\D/g, "");
  if (d.startsWith("995") && d.length === 12) return "+" + d;
  if (!s.startsWith("+") && d.length === 9) return "+995" + d;
  return null;
}

// Telegram username: принимаем «@user», «user», «t.me/user», «https://t.me/user».
// Возвращает username без «@» (5–32 символа: латиница, цифры, «_») или null.
// Пустая строка → "" (поле необязательное).
export function normTg(raw) {
  let s = String(raw || "").trim();
  if (!s) return "";
  s = s.replace(/^https?:\/\//i, "").replace(/^(www\.)?(t|telegram)\.me\//i, "").replace(/^@/, "").replace(/\/+$/, "");
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) ? s : null;
}

export const tgDisplay = (u) => (u ? "@" + u : "");
export const tgLink = (u) => (u && /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(u) ? `https://t.me/${u}` : "");
