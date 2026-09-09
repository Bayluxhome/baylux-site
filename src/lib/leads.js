// Заявки с сайта: текст уведомления, получатели, доставка в Telegram (задача №03).
//
// Кто получает заявку:
//   1. общий чат менеджеров (TELEGRAM_CHAT_ID) — всегда;
//   2. владелец объявления, если это риелтор с Telegram-id (не аккаунт Baylux);
//   3. ответственный за объект в управлении (responsible_tg).
// Один человек не получает две копии. Результат доставки пишется в leads.notified_at /
// notify_error — недоставленное досылает крон /api/cron/lead-retry.
//
// Отправка идёт ТОЛЬКО через Telegram Bot API: здесь нет ни сервера рассылок, ни e-mail.
import { supa } from "@/lib/supabase";
import { SITE_URL } from "@/config";
import { slugify, cleanAddress } from "@/data/sheet";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

// Машинный тип заявки → подпись для менеджера. Всегда по-русски: менеджеры русскоязычные,
// а тип на языке посетителя («Sale», «გაყიდვა») в чате читать неудобно.
export const LEAD_TYPES = {
  viewing: "Просмотр объекта",
  rent: "Аренда — заявка",
  daily: "Посуточно — бронирование",
  management: "Передача в управление",
  complex: "Заявка по ЖК",
  cleaning: "Клининг",
  landing: "Заявка со страницы подборки",
  other: "Обращение",
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fmtTime(iso) {
  try {
    return new Date(iso || Date.now()).toLocaleString("ru-RU", { timeZone: "Asia/Tbilisi", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

// Текст сообщения. Ссылка на карточку — абсолютная, ID — устойчивый id объявления,
// чтобы менеджер открыл объект в один клик и мог назвать номер клиенту.
export function buildLeadText(lead, listing) {
  const typeLabel = LEAD_TYPES[lead.type_key] || lead.type || LEAD_TYPES.other;
  const lines = [`🔔 <b>${esc(typeLabel)}</b> · ${fmtTime(lead.created_at)}`];
  if (listing?.slug) {
    lines.push(`🏠 <a href="${SITE_URL}/property/${listing.slug}">${esc(lead.object_title || listing.slug)}</a>`);
    lines.push(`ID: <code>${esc(listing.id)}</code>`);
  } else if (lead.object_title) {
    lines.push(`🏠 ${esc(lead.object_title)}`);
  }
  lines.push(`👤 ${esc(lead.name || "—")}`);
  lines.push(`📞 <code>${esc(lead.phone || "—")}</code>`);
  if (lead.comment) lines.push(`💬 ${esc(lead.comment)}`);
  if (lead.source) lines.push(`<i>источник: ${esc(lead.source)}</i>`);
  if (lead.notify_attempts > 0) lines.push(`<i>повторная доставка</i>`);
  return lines.join("\n");
}

// Получатели без дублей. bayluxhome — служебный аккаунт парсера: у него нет «личного»
// Telegram, все его заявки и так идут в общий чат.
export function leadRecipients(lead, listing) {
  const set = new Set();
  if (CHAT) set.add(String(CHAT));
  if (listing) {
    if (listing.tg_user_id != null && listing.tg_username !== "bayluxhome") set.add(String(listing.tg_user_id));
    if (listing.managed_by_baylux && listing.responsible_tg != null) set.add(String(listing.responsible_tg));
  }
  if (lead.assigned_tg != null) set.add(String(lead.assigned_tg));
  return [...set];
}

async function tgSend(chatId, text) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`${chatId}: ${j.description || r.status}`);
}

// Доставка одной заявки всем получателям. Возвращает { delivered, errors[] } и
// обновляет строку leads. Считаем доставленной, если ушла хотя бы в общий чат:
// личные копии — удобство, а не гарантия (риелтор мог заблокировать бота).
export async function deliverLead(lead, listing) {
  if (!TOKEN) return { delivered: 0, errors: ["TELEGRAM_BOT_TOKEN не задан"] };
  const text = buildLeadText(lead, listing);
  const errors = [];
  let delivered = 0;
  for (const chatId of leadRecipients(lead, listing)) {
    try { await tgSend(chatId, text); delivered++; }
    catch (e) { errors.push(e.message); }
  }
  if (supa && lead.id) {
    const patch = { notify_attempts: (lead.notify_attempts || 0) + 1, notify_error: errors.length ? errors.join("; ").slice(0, 500) : null };
    if (delivered > 0 && !lead.notified_at) patch.notified_at = new Date().toISOString();
    await supa.from("leads").update(patch).eq("id", lead.id);
  }
  return { delivered, errors };
}

// Досылка недоставленных заявок (до 10 попыток, не старше 3 дней).
// Вызывается при каждой новой заявке и раз в сутки кроном — на Hobby-тарифе Vercel
// чаще крон нельзя, а так повтор случается при первом же следующем обращении.
export async function retryUndelivered(limit = 20) {
  if (!supa) return { pending: 0, delivered: 0, failed: 0 };
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data: rows } = await supa
    .from("leads").select("*")
    .is("notified_at", null).lt("notify_attempts", 10).gte("created_at", since)
    .order("created_at", { ascending: true }).limit(limit);
  let delivered = 0, failed = 0;
  for (const lead of rows || []) {
    const res = await deliverLead(lead, await listingForLead(lead.listing_id));
    if (res.delivered > 0) delivered++; else failed++;
  }
  return { pending: (rows || []).length, delivered, failed };
}

// Объявление для заявки — только поля, нужные для ссылки и получателей.
export async function listingForLead(listingId) {
  if (!supa || !listingId) return null;
  const { data } = await supa
    .from("listings")
    .select("id, building_name, type, price, owner_email, tg_user_id, tg_username, managed_by_baylux, responsible_tg, responsible_email, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!data) return null;
  // slug строится так же, как на страницах сайта (см. data/sheet.js slugify)
  const bn = cleanAddress(data.building_name);
  return { ...data, slug: slugify(`${bn}-${data.type || ""}-${data.price || ""}`) };
}
