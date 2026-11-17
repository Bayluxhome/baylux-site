// Подписка на подборки в Telegram из чата Hanna (T-20261118-02, дополнение 18.11).
//
// Поток: Hanna вызывает telegram_subscribe → createSubscription пишет строку в chat_subscriptions
// (active=false) и отдаёт deep link https://t.me/<бот>?start=s_<token>. Клиент жмёт кнопку в виджете →
// бот сайта (вебхук /api/tg) получает «/start s_<token>» → handleSubscribeStart привязывает chat_id,
// ставит consent_at и active=true и сразу присылает подборку (3–5 вариантов). «/stop» → handleStop.
// Рассылки новых вариантов здесь НЕТ (следующий шаг).
//
// Модуль без серверных импортов: база (db = supabase-клиент), выдача объектов и отправка
// передаются параметрами — так обработчики можно прогнать тестом без Telegram и без базы.
import { randomBytes } from "crypto";
import { searchUnits } from "./search.js";

// Бот сайта — тот же, что TELEGRAM_BOT_TOKEN и вебхук /api/tg (вход на сайт: /api/tg-login-init).
export const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || "baylux_leads_bot").replace(/^@/, "");
export const START_PREFIX = "s_";
const TOKEN_RE = /^[A-Za-z0-9_-]{8,40}$/;
const LINK_TTL_DAYS = 30; // неактивированная ссылка живёт 30 дней

const LANGS = ["ru", "en", "ka"];
const QUERY_KEYS = ["city", "deal", "type", "rooms", "budget_min", "budget_max", "currency", "district", "near_sea", "area_min", "area_max", "price_per_m2_min", "price_per_m2_max", "sort"];

export function newSubToken() { return randomBytes(9).toString("base64url"); }
export function deepLink(token) { return `https://t.me/${BOT_USERNAME}?start=${START_PREFIX}${token}`; }

// Только известные параметры поиска, короткие значения.
export function cleanQuery(input) {
  const q = {};
  for (const k of QUERY_KEYS) {
    const v = input?.[k];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "number" || typeof v === "boolean") q[k] = v;
    else q[k] = String(v).slice(0, 80);
  }
  return q;
}

// Токен подборки: из ctx (создана в этом ответе) или из ссылки /c/<token>, которую передала модель.
export function collectionTokenOf(input, ctx) {
  if (ctx?.collectionToken) return ctx.collectionToken;
  const raw = String(input?.collection_url || input?.collection_token || "");
  const m = raw.match(/\/c\/([A-Za-z0-9_-]{8,32})/) || raw.match(/^([A-Za-z0-9_-]{8,32})$/);
  return m ? m[1] : null;
}

/** Создать подписку (ещё не активную). Нет таблицы/базы → { ok:false }, кнопку не показываем. */
export async function createSubscription(db, input, ctx = {}) {
  if (!db) return { ok: false, error: "not_available" };
  const query = cleanQuery(input || {});
  if (!query.city && !query.deal) return { ok: false, error: "need_city_or_deal" };
  const row = {
    token: newSubToken(),
    query,
    collection_token: collectionTokenOf(input, ctx),
    lang: LANGS.includes(ctx.lang) ? ctx.lang : "ru",
    active: false,
  };
  const { data, error } = await db.from("chat_subscriptions").insert(row).select("token").single();
  if (error || !data) return { ok: false, error: "not_available" }; // в т.ч. таблицы ещё нет
  const url = deepLink(data.token);
  ctx.subscribeUrl = url;
  return { ok: true, button_shown: true };
}

// ---------- Бот ----------
const TXT = {
  ru: {
    subscribed: "Вы подписались на подборки Baylux. Отписаться: /stop",
    first: "Подборка по вашему запросу:",
    none: "Сейчас точных совпадений нет. Как только появятся подходящие варианты, пришлю их сюда.",
    coll: "Ваша подборка на сайте:",
    stopped: "Вы отписались от подборок Baylux. Больше сообщений о подборках не будет. Подписаться снова можно из чата на сайте.",
    not_sub: "У вас нет активных подписок на подборки Baylux.",
    bad: "Ссылка на подписку устарела или уже использована. Откройте чат на сайте bayluxhome.com и нажмите кнопку ещё раз.",
  },
  en: {
    subscribed: "You have subscribed to Baylux selections. Unsubscribe: /stop",
    first: "Selection for your request:",
    none: "No exact matches right now. As soon as suitable options appear, I will send them here.",
    coll: "Your selection on the website:",
    stopped: "You have unsubscribed from Baylux selections. No more selection messages will be sent. You can subscribe again from the chat on the website.",
    not_sub: "You have no active Baylux selection subscriptions.",
    bad: "This subscription link has expired or was already used. Open the chat on bayluxhome.com and tap the button again.",
  },
  ka: {
    subscribed: "თქვენ გამოიწერეთ Baylux-ის შერჩევები. გამოწერის გაუქმება: /stop",
    first: "შერჩევა თქვენი მოთხოვნით:",
    none: "ზუსტი შესაბამისობა ახლა არ არის. შესაფერისი ვარიანტების გამოჩენისთანავე აქ გამოგიგზავნით.",
    coll: "თქვენი შერჩევა საიტზე:",
    stopped: "თქვენ გააუქმეთ Baylux-ის შერჩევების გამოწერა. შეტყობინებები აღარ მოგივათ. ხელახლა გამოწერა შეგიძლიათ საიტის ჩატიდან.",
    not_sub: "Baylux-ის შერჩევების აქტიური გამოწერა არ გაქვთ.",
    bad: "გამოწერის ბმული ვადაგასულია ან უკვე გამოყენებულია. გახსენით ჩატი bayluxhome.com-ზე და ხელახლა დააჭირეთ ღილაკს.",
  },
};
const L = (lang) => TXT[LANGS.includes(lang) ? lang : "ru"];
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Текст первой подборки (HTML для Telegram). units — публичная выдача (getAllUnits + stripPrivate). */
export function firstSelectionText(sub, units, { siteUrl, rate } = {}) {
  const t = L(sub.lang);
  const res = searchUnits(units, { ...(sub.query || {}), limit: 5 }, { rate, lang: sub.lang, widen: false }); // подписка: только точные совпадения, без «поиска шире»
  const lines = [`✅ ${esc(t.subscribed)}`, ""];
  if (res.items.length) {
    lines.push(`<b>${esc(t.first)}</b>`);
    res.items.forEach((c, i) => {
      const where = [c.address, c.city].filter(Boolean).join(", ");
      lines.push(`${i + 1}. ${esc(c.title)} · ${esc(c.price)}${where ? ` · ${esc(where)}` : ""}\n${siteUrl}${c.url}`);
    });
  } else lines.push(esc(t.none));
  if (sub.collection_token) lines.push("", `${esc(t.coll)} ${siteUrl}/c/${sub.collection_token}`);
  return { text: lines.join("\n"), count: res.items.length };
}

/** Разбор «/start s_<token>». null — это не наша команда. */
export function parseStart(text) {
  const m = String(text || "").trim().match(/^\/start(?:@\w+)?\s+s_([A-Za-z0-9_-]+)$/);
  return m && TOKEN_RE.test(m[1]) ? m[1] : null;
}
export const isStop = (text) => /^\/stop(?:@\w+)?$/i.test(String(text || "").trim());

/**
 * «/start s_<token>»: привязать chat_id, сохранить дату согласия, прислать первую подборку.
 * deps: { db, loadUnits: async () => units, send: async (chat_id, html) => any, siteUrl, rate, now? }
 */
export async function handleSubscribeStart(deps, msg, token) {
  const { db, send } = deps;
  const chat = msg.chat?.id;
  if (msg.chat?.type && msg.chat.type !== "private") return { ok: false, error: "not_private" };
  const { data: sub, error } = await db.from("chat_subscriptions").select("*").eq("token", token).maybeSingle();
  const now = deps.now ? deps.now() : new Date();
  const expired = sub && !sub.chat_id && (now - new Date(sub.created_at)) > LINK_TTL_DAYS * 864e5;
  const foreign = sub && sub.chat_id && String(sub.chat_id) !== String(chat);
  if (error || !sub || expired || foreign) {
    await send(chat, esc(L(sub?.lang || guessTgLang(msg)).bad));
    return { ok: false, error: !sub ? "not_found" : expired ? "expired" : foreign ? "used" : "db" };
  }
  const upd = { chat_id: chat, tg_username: msg.from?.username || null, active: true, stopped_at: null };
  if (!sub.consent_at || !sub.active) upd.consent_at = now.toISOString(); // повторный /start после /stop — новое согласие
  const { error: e2 } = await db.from("chat_subscriptions").update(upd).eq("id", sub.id);
  if (e2) { await send(chat, esc(L(sub.lang).bad)); return { ok: false, error: "db" }; }
  const units = await deps.loadUnits();
  const { text, count } = firstSelectionText({ ...sub, ...upd }, units, deps);
  await send(chat, text);
  return { ok: true, count };
}

/** «/stop»: отписать сразу все подписки этого чата. */
export async function handleStop(deps, msg) {
  const { db, send } = deps;
  const chat = msg.chat?.id;
  const { data } = await db.from("chat_subscriptions").update({ active: false, stopped_at: (deps.now ? deps.now() : new Date()).toISOString() })
    .eq("chat_id", chat).eq("active", true).select("lang");
  const lang = data?.[0]?.lang || guessTgLang(msg);
  await send(chat, esc(data?.length ? L(lang).stopped : L(lang).not_sub));
  return { ok: true, stopped: data?.length || 0 };
}

function guessTgLang(msg) {
  const c = String(msg?.from?.language_code || "").slice(0, 2);
  return c === "ka" ? "ka" : c === "en" ? "en" : "ru";
}
