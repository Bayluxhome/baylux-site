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
import { SITE_URL, ADMIN_EMAILS } from "@/config";
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
// personal=true — версия для риелтора: без служебной строки «источник», с ссылкой на кабинет.
export function buildLeadText(lead, listing, { personal = false } = {}) {
  const typeLabel = LEAD_TYPES[lead.type_key] || lead.type || LEAD_TYPES.other;
  const lines = [`🔔 <b>${esc(typeLabel)}</b> · ${fmtTime(lead.created_at)}`];
  if (listing?.slug) {
    lines.push(`🏠 <a href="${SITE_URL}/property/${listing.slug}">${esc(lead.object_title || listing.slug)}</a>`);
    lines.push(`ID: <code>${esc(listing.id)}</code>`);
    if (listing.building_name) lines.push(`📍 ${esc(listing.building_name)}${listing.district ? `, ${esc(listing.district)}` : ""}`);
    if (listing.price && listing.price !== "—") lines.push(`💰 ${esc(listing.price)}${listing.deal === "rent" ? " / мес" : listing.deal === "daily" ? " / сутки" : ""}`);
  } else if (lead.object_title) {
    lines.push(`🏠 ${esc(lead.object_title)}`);
  }
  lines.push(`👤 ${esc(lead.name || "—")}`);
  lines.push(`📞 <code>${esc(lead.phone || "—")}</code>`);
  if (lead.comment) lines.push(`💬 ${esc(lead.comment)}`);
  if (personal) lines.push(`<a href="${SITE_URL}/my/leads">Открыть заявку в кабинете</a>`);
  else if (lead.source) lines.push(`<i>источник: ${esc(lead.source)}</i>`);
  if (lead.notify_attempts > 0) lines.push(`<i>повторная доставка</i>`);
  return lines.join("\n");
}

// Служебные (общие) получатели: чат менеджеров, ответственный за объект в управлении,
// назначенный (владелец подборки). Риелтор-автор объявления — отдельно, см. resolveRealtorChat.
export function leadRecipients(lead, listing) {
  const set = new Set();
  if (CHAT) set.add(String(CHAT));
  if (listing?.managed_by_baylux && listing.responsible_tg != null) set.add(String(listing.responsible_tg));
  if (lead.assigned_tg != null) set.add(String(lead.assigned_tg));
  return [...set];
}

// Личный Telegram риелтора, назначенного на объект. Связь — авторство объявления
// (owner_email / tg_user_id), только на сервере. Порядок: Telegram-id прямо у объявления
// (вход через бота) → профиль риелтора по email → аккаунт сайта по email.
// Служебный аккаунт парсера (bayluxhome / admin-email) — не риелтор: его заявки идут в общий чат.
// Возвращает { chatId } либо { skip: "skipped_no_realtor" | "skipped_no_telegram_chat" }.
export async function resolveRealtorChat(listing) {
  if (!listing) return { skip: "skipped_no_realtor" };
  const em = String(listing.owner_email || "").toLowerCase();
  const isService = listing.tg_username === "bayluxhome" || ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(em);
  if (isService) return { skip: "skipped_no_realtor" };
  if (listing.tg_user_id != null) return { chatId: String(listing.tg_user_id) };
  if (!em || !supa) return { skip: "skipped_no_realtor" };
  const { data: r } = await supa.from("realtors").select("tg_user_id").ilike("email", em).maybeSingle();
  if (r?.tg_user_id != null) return { chatId: String(r.tg_user_id) };
  const { data: u } = await supa.from("site_users").select("tg_user_id").ilike("email", em).maybeSingle();
  if (u?.tg_user_id != null) return { chatId: String(u.tg_user_id) };
  return { skip: "skipped_no_telegram_chat" };
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

// Доставка одной заявки. Два независимых канала с отдельным учётом:
//   1) служебные получатели (общий чат и т.п.) — notified_at / notify_error;
//   2) лично риелтор объекта — realtor_notify_status: sent / failed / skipped_no_realtor /
//      skipped_no_telegram_chat (+ время и безопасное описание ошибки).
// Идемпотентность: ключ = id заявки + канал. Общий чат не шлём повторно, если notified_at
// уже стоит; риелтору — только пока статус не sent. Повторный вызов (double-click, retry,
// крон) новых сообщений не плодит. Ошибка Telegram заявку не откатывает — она уже в базе.
export async function deliverLead(lead, listing) {
  if (!TOKEN) return { delivered: 0, errors: ["TELEGRAM_BOT_TOKEN не задан"] };
  const errors = [];
  let delivered = 0;
  const patch = { notify_attempts: (lead.notify_attempts || 0) + 1 };

  // 1) служебные получатели
  if (!lead.notified_at) {
    const text = buildLeadText(lead, listing);
    for (const chatId of leadRecipients(lead, listing)) {
      try { await tgSend(chatId, text); delivered++; }
      catch (e) { errors.push(e.message); }
    }
    patch.notify_error = errors.length ? errors.join("; ").slice(0, 500) : null;
    if (delivered > 0) patch.notified_at = new Date().toISOString();
  }

  // 2) лично риелтор объекта
  if (lead.realtor_notify_status !== "sent") {
    const r = await resolveRealtorChat(listing);
    if (r.skip) {
      patch.realtor_notify_status = r.skip;
    } else {
      try {
        await tgSend(r.chatId, buildLeadText(lead, listing, { personal: true }));
        patch.realtor_notify_status = "sent";
        patch.realtor_notify_at = new Date().toISOString();
        patch.realtor_notify_error = null;
        delivered++;
      } catch (e) {
        // Описание без chat id и токена: только текст ошибки Telegram (напр. «bot was blocked by the user»).
        patch.realtor_notify_status = "failed";
        patch.realtor_notify_error = String(e.message || "").replace(/^\d+:\s*/, "").slice(0, 200);
        errors.push("realtor: " + patch.realtor_notify_error);
      }
    }
  }

  if (supa && lead.id) await supa.from("leads").update(patch).eq("id", lead.id);
  return { delivered, errors };
}

// Досылка недоставленных заявок (до 10 попыток, не старше 3 дней).
// Вызывается при каждой новой заявке и раз в сутки кроном — на Hobby-тарифе Vercel
// чаще крон нельзя, а так повтор случается при первом же следующем обращении.
export async function retryUndelivered(limit = 20) {
  if (!supa) return { pending: 0, delivered: 0, failed: 0 };
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  // Недоставленные по любому из каналов: общий чат (notified_at пуст) или риелтор (failed).
  const { data: rows } = await supa
    .from("leads").select("*")
    .or("notified_at.is.null,realtor_notify_status.eq.failed")
    .lt("notify_attempts", 10).gte("created_at", since)
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
    .select("id, building_name, district, deal, type, price, owner_email, tg_user_id, tg_username, managed_by_baylux, responsible_tg, responsible_email, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!data) return null;
  // slug строится так же, как на страницах сайта (см. data/sheet.js slugify)
  const bn = cleanAddress(data.building_name);
  return { ...data, slug: slugify(`${bn}-${data.type || ""}-${data.price || ""}`) };
}
