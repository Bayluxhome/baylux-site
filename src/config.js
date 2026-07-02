// Публичные настройки сайта
export const TG_BOT = "baylux_leads_bot"; // имя бота для входа через Telegram
export const TG_CONTACT = "bayluxhome"; // основной Telegram-контакт (владелец/агентство), без @ — фолбэк для объявлений без личного ника автора

// Телефоны сайта. ВАЖНО: это два РАЗНЫХ номера.
// PHONE — основной номер для звонков (tel:), берётся из env NEXT_PUBLIC_PHONE.
// WA_PHONE — отдельный номер для WhatsApp (wa.me), НЕ менять.
export const PHONE = process.env.NEXT_PUBLIC_PHONE || "995706070305"; // звонки, без +
export const WA_PHONE = "995599200796"; // WhatsApp, без + — НЕ менять
export function fmtPhone(d) {
  const s = String(d || "").replace(/\D/g, "");
  const m = s.match(/^(995)(\d{3})(\d{2})(\d{2})(\d{2})$/); // 995 XXX XX XX XX
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]}` : "+" + s;
}
export const PHONE_DISPLAY = fmtPhone(PHONE);   // +995 706 07 03 05
export const WA_DISPLAY = fmtPhone(WA_PHONE);   // +995 599 20 07 96
export const telLink = "tel:+" + PHONE;
export function waLink(text) {
  const t = text || "Здравствуйте! Пишу с сайта Baylux по объекту.";
  return "https://wa.me/" + WA_PHONE + "?text=" + encodeURIComponent(t);
}

// Реквизиты оператора для футера (пока физлицо; после регистрации ШПС заменить).
// ⚠️ Подставь точные ФИО/контакт оператора.
export const OPERATOR = {
  name: "Kologrivova Tatiana", // ФИО оператора-физлица (до регистрации ШПС)
  email: "bayluxhome@gmail.com",
  phone: PHONE_DISPLAY, // основной телефон сайта (из NEXT_PUBLIC_PHONE)
};

// Версия и дата юр-документов (Privacy/Terms/Cookies/Rules)
export const DOC_VERSION = "1.0";
export const DOC_UPDATED = "01.06.2026";

// Главные администраторы сайта (по email сессии или Telegram-id).
// Имеют доступ к /admin: новости, удаление любых объявлений.
export const ADMIN_EMAILS = ["bayluxhome@gmail.com", "bayluxhome@yahoo.com"];
export const ADMIN_TG_IDS = []; // при необходимости добавить Telegram user id (число)

// Соцсети для футера. Пустую строку — иконка скрывается.
export const SOCIAL = {
  instagram: "https://www.instagram.com/baylux_home",
  facebook: "https://www.facebook.com/profile.php?id=61590347708938",
};

// Telegram-каналы недвижимости по регионам (username без @). Пустая строка — кнопка скрыта.
export const TG_CHANNELS = {
  batumi: "baylux_batumi",   // побережье/запад Грузии
  tbilisi: "baylux_tbilisi", // Тбилиси/восток
};
// Города восточной Грузии → тбилисский канал; остальные → батумский (та же логика, что у бота).
const TG_EAST = ["тбилиси", "рустави", "мцхета", "гори", "телави", "гудаури", "бакуриани"];
export function channelForCity(city) {
  const c = String(city || "").trim().toLowerCase();
  const key = TG_EAST.some((e) => c.includes(e)) ? "tbilisi" : "batumi";
  const username = TG_CHANNELS[key];
  return username ? { key, username, url: "https://t.me/" + username } : null;
}

// Mapbox public token — задаётся переменной окружения NEXT_PUBLIC_MAPBOX_TOKEN (Vercel + .env.local).
// В коде не храним: GitHub push protection блокирует токены Mapbox даже публичные.
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

