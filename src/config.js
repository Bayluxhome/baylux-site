// Публичные настройки сайта
export const TG_BOT = "baylux_leads_bot"; // имя бота для входа через Telegram

// Реквизиты оператора для футера (пока физлицо; после регистрации ШПС заменить).
// ⚠️ Подставь точные ФИО/контакт оператора.
export const OPERATOR = {
  name: "Parshuto Dmitrii", // ФИО оператора-физлица (до регистрации ШПС)
  email: "bayluxhome@yahoo.com",
  phone: "+995 555 11 24 781",
};

// Версия и дата юр-документов (Privacy/Terms/Cookies/Rules)
export const DOC_VERSION = "1.0";
export const DOC_UPDATED = "01.06.2026";

export const WA_PHONE = process.env.NEXT_PUBLIC_WA_PHONE || "995555000000"; // заменить на реальный номер
export function waLink(text) {
  const t = text || "Здравствуйте! Пишу с сайта Baylux по объекту.";
  return "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(t);
}
