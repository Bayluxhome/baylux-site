// Публичные настройки сайта
export const TG_BOT = "baylux_leads_bot"; // имя бота для входа через Telegram
export const WA_PHONE = process.env.NEXT_PUBLIC_WA_PHONE || "995555000000"; // заменить на реальный номер
export function waLink(text) {
  const t = text || "Здравствуйте! Пишу с сайта Baylux по объекту.";
  return "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(t);
}
