import { supa } from "@/lib/supabase";
import { slugify } from "@/data/sheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID; // чат CEO для модерации
const CHANNEL = process.env.TELEGRAM_CHANNEL || ""; // публичный канал-витрина, напр. @baylux_batumi
const API = `https://api.telegram.org/bot${TOKEN}`;
const SECRET = (TOKEN || "").slice(-24).replace(/[^A-Za-z0-9_-]/g, "") || "baylux";
const SITE = "https://baylux-site.vercel.app";

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const DEAL_MAP = { "продажа": "sale", "аренда": "rent", "посуточно": "daily" };
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const COMPLEX_TYPES = /новострой/i;

// Цена: добавляем $ если валюта не указана, не задваиваем, разбиваем тысячи.
function normPrice(raw) {
  let s = (raw || "").trim();
  if (!s) return "—";
  s = s.replace(/\d{4,}/, (m) => m.replace(/\B(?=(\d{3})+(?!\d))/g, " ")); // 60000 -> 60 000
  const hasCur = /[$₾€]|usd|gel|lari|лар|евро|eur/i.test(s);
  if (!hasCur) s = "$" + s;
  s = s.replace(/\$\s*\$+/g, "$");
  return s;
}

// Грузинский номер: принимаем +995XXXXXXXXX, 995XXXXXXXXX или локальные 9 цифр. Иначе null.
function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
}
const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

// ---- Telegram helpers ----
async function tg(method, body) {
  const r = await fetch(`${API}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}
function send(chat_id, text, keyboard) {
  const body = { chat_id, text, parse_mode: "HTML" };
  if (keyboard) body.reply_markup = { keyboard: keyboard.map((r) => r.map((t) => ({ text: t }))), resize_keyboard: true, one_time_keyboard: true };
  else body.reply_markup = { remove_keyboard: true };
  return tg("sendMessage", body);
}
function sendContact(chat) {
  return tg("sendMessage", { chat_id: chat, text: STEPS.contact.q, reply_markup: { keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }], [{ text: "⬅️ Назад" }, { text: "✖️ Отмена" }]], resize_keyboard: true, one_time_keyboard: true } });
}
function modButtons(status, id) {
  const geo = [{ text: "📍 Исправить гео", callback_data: `eg:${id}` }];
  if (status === "approved") return { inline_keyboard: [[{ text: "🗑 Снять с публикации", callback_data: `un:${id}` }], geo] };
  if (status === "rejected") return { inline_keyboard: [[{ text: "↩️ Опубликовать", callback_data: `ap:${id}` }], geo] };
  return { inline_keyboard: [[{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }], geo] };
}

// ---- состояние диалога ----
async function getDraft(uid) {
  const { data } = await supa.from("drafts").select("*").eq("tg_user_id", uid).maybeSingle();
  return data || { tg_user_id: uid, step: null, data: {} };
}
async function saveDraft(uid, step, data) {
  await supa.from("drafts").upsert({ tg_user_id: uid, step, data, updated_at: new Date().toISOString() });
}
async function clearDraft(uid) { await supa.from("drafts").delete().eq("tg_user_id", uid); }

// ---- загрузка фото в storage ----
async function uploadPhoto(fileId) {
  const f = await tg("getFile", { file_id: fileId });
  const path = f?.result?.file_path;
  if (!path) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN}/${path}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const up = await supa.storage.from("listing-photos").upload(name, buf, { contentType: "image/jpeg", upsert: false });
  if (up.error) return null;
  return supa.storage.from("listing-photos").getPublicUrl(name).data.publicUrl;
}

const MAIN_MENU = [["➕ Добавить объявление"], ["📋 Мои объявления", "🌐 Сайт"]];
const STEP_ORDER = ["country", "city", "deal", "type", "address", "geo", "price", "area", "rooms", "floor", "about", "photos", "contact"];
function showMenu(chat, greet) { return send(chat, greet || "Главное меню Baylux:", MAIN_MENU); }
async function showMyListings(chat, uid) {
  const STAT = { pending: "⏳ на модерации", approved: "✅ опубликовано", rejected: "🚫 снято" };
  const { data } = await supa.from("listings").select("*").eq("tg_user_id", uid).order("created_at", { ascending: false });
  if (!data || !data.length) return send(chat, "У вас пока нет объявлений. Нажмите «➕ Добавить объявление».", MAIN_MENU);
  const lines = data.slice(0, 20).map((r, i) => `${i + 1}. ${DEAL_RU[r.deal] || r.deal} · ${r.type} · ${r.price} — ${STAT[r.status] || r.status}`).join("\n");
  return send(chat, "📋 Ваши объявления:\n\n" + lines + "\n\nВход и детали на сайте: " + SITE + "/my", MAIN_MENU);
}

const STEPS = {
  country: { q: "Шаг 1/12. Страна объекта? (Сейчас работаем в Грузии 🇬🇪)", kb: [["🇬🇪 Грузия"]] },
  city: { q: "Шаг 2/12. Город?", kb: [["Батуми", "Тбилиси"], ["Кутаиси", "Гонио"], ["Махинджаури", "Чакви"]] },
  deal: { q: "Шаг 3/12. Тип сделки?", kb: [["Продажа", "Аренда", "Посуточно"]] },
  type: { q: "Шаг 4/12. Тип объекта?", kb: [["Квартира", "Студия", "Дом"], ["Коммерция", "Офис"], ["Участок", "Гараж"]] },
  address: { q: "Шаг 5/12. Адрес объекта (улица и номер дома). Например: ул. Шерифа Химшиашвили, 1" },
  geo: { q: "Шаг 6/12. Пришлите точку на карте — так объект точно встанет на карту сайта.\n📎 (скрепка) → Геопозиция → «Выбрать на карте».\n🛰 Совет: переключите карту в режим «Спутник» (значок слоёв справа) и поставьте точку прямо на нужный дом.\nЕсли не получается — напишите «пропустить»." },
  price: { q: "Шаг 7/12. Цена? Например: $74 000 (продажа) или $650 / мес (аренда)" },
  area: { q: "Шаг 8/12. Площадь в м²? (число, например 56)" },
  rooms: { q: "Шаг 9/12. Сколько комнат? (число; студия/коммерция — 0)" },
  floor: { q: "Шаг 10/12. Этаж? Например: 10/22 (этаж/всего этажей). Для дома/участка — поставьте «—»." },
  about: { q: "Шаг 11/12. Краткое описание объекта." },
  photos: { q: "Шаг 12/12. Пришлите фото (по одному, до 8). Когда закончите — /done. Можно без фото — сразу /done." },
  contact: { q: "Последний шаг — контактный номер (Грузия, +995).\nПросто напишите номер сообщением, например: +995 555 12 34 56.\n(Или нажмите кнопку ниже, чтобы поделиться своим номером.)" },
};
async function ask(chat, step) {
  const kb = [...(STEPS[step].kb || []), ["⬅️ Назад", "✖️ Отмена"]];
  return send(chat, STEPS[step].q, kb);
}

async function onMessage(msg) {
  const chat = msg.chat.id;
  const uid = msg.from.id;
  const text = (msg.text || "").trim();

  if (text.startsWith("/start login_")) {
    const ltoken = text.slice("/start login_".length).trim();
    if (ltoken) await supa.from("login_tokens").update({ tg_user_id: uid, name: msg.from.first_name || "", username: msg.from.username || "" }).eq("token", ltoken);
    return send(chat, "✅ Готово! Вернитесь на сайт — вход выполнен.", MAIN_MENU);
  }
  if (text === "/start" || text === "/menu") { await clearDraft(uid); return showMenu(chat, "👋 Baylux — кабинет владельца объектов. Выберите действие:"); }
  if (text === "/cancel" || text === "/отмена" || text === "✖️ Отмена") { await clearDraft(uid); return showMenu(chat, "Отменено. Выберите действие:"); }
  if (text === "/add" || text === "/добавить" || text === "➕ Добавить объявление") {
    await saveDraft(uid, "country", { tg_user_id: uid, tg_username: msg.from.username || "" });
    return ask(chat, "country");
  }
  if (text === "/my" || text === "📋 Мои объявления") return showMyListings(chat, uid);
  if (text === "🌐 Сайт" || text === "/site") return send(chat, "🌐 " + SITE + "/my — ваши объявления и вход на сайт.", MAIN_MENU);

  const d = await getDraft(uid);
  if (!d.step) return showMenu(chat, "Выберите действие:");
  const data = d.data || {};

  // Модератор исправляет геопозицию объекта
  if (d.step === "modgeo") {
    if (msg.location) {
      await supa.from("listings").update({ lat: msg.location.latitude, lng: msg.location.longitude }).eq("id", data.editId);
      await clearDraft(uid);
      return send(chat, `✅ Геопозиция объекта обновлена.\n📍 ${mapsLink(msg.location.latitude, msg.location.longitude)}\nНа сайте обновится в течение нескольких минут.`, MAIN_MENU);
    }
    return send(chat, "Пришлите новую точку на карте: 📎 → Геопозиция → «Выбрать на карте» (лучше в режиме «Спутник»). Или /cancel.");
  }

  if (text === "⬅️ Назад" || text === "/back") {
    const idx = STEP_ORDER.indexOf(d.step);
    if (idx <= 0) { await clearDraft(uid); return showMenu(chat, "Главное меню:"); }
    const prev = STEP_ORDER[idx - 1];
    await saveDraft(uid, prev, data);
    return prev === "contact" ? sendContact(chat) : ask(chat, prev);
  }

  switch (d.step) {
    case "country": {
      if (!/груз|georgia|🇬🇪/i.test(text)) return send(chat, "Пока размещаем объекты только в Грузии 🇬🇪. Нажмите «🇬🇪 Грузия».", [["🇬🇪 Грузия"], ["⬅️ Назад", "✖️ Отмена"]]);
      data.country = "Грузия"; await saveDraft(uid, "city", data); return ask(chat, "city");
    }
    case "city": { data.city = text.replace(/^🇬🇪\s*/, "").trim() || "Батуми"; await saveDraft(uid, "deal", data); return ask(chat, "deal"); }
    case "deal": {
      const deal = DEAL_MAP[text.toLowerCase()];
      if (!deal) return ask(chat, "deal");
      data.deal = deal; await saveDraft(uid, "type", data); return ask(chat, "type");
    }
    case "type": { data.type = text; await saveDraft(uid, "address", data); return ask(chat, "address"); }
    case "address": { data.address = text; await saveDraft(uid, "geo", data); return ask(chat, "geo"); }
    case "geo": {
      if (msg.location) { data.lat = msg.location.latitude; data.lng = msg.location.longitude; }
      // если текст/«пропустить» — оставляем без координат (центр Батуми по умолчанию)
      await saveDraft(uid, "price", data); return ask(chat, "price");
    }
    case "price": { data.price = normPrice(text); await saveDraft(uid, "area", data); return ask(chat, "area"); }
    case "area": { data.area = parseInt(text, 10) || 0; await saveDraft(uid, "rooms", data); return ask(chat, "rooms"); }
    case "rooms": { data.rooms = parseInt(text, 10) || 0; await saveDraft(uid, "floor", data); return ask(chat, "floor"); }
    case "floor": { data.floor = text; await saveDraft(uid, "about", data); return ask(chat, "about"); }
    case "about": { data.about = text; data.photos = []; await saveDraft(uid, "photos", data); return ask(chat, "photos"); }
    case "photos": {
      if (msg.photo && msg.photo.length) {
        const url = await uploadPhoto(msg.photo[msg.photo.length - 1].file_id);
        if (url) { data.photos = (data.photos || []).concat(url); await saveDraft(uid, "photos", data); return send(chat, `📷 Фото добавлено (${data.photos.length}). Ещё или /done.`); }
        return send(chat, "Не удалось загрузить фото, попробуйте другое или /done.");
      }
      if (text === "/done" || text === "/готово") { await saveDraft(uid, "contact", data); return sendContact(chat); }
      return send(chat, "Пришлите фото или /done.");
    }
    case "contact": {
      // Принимаем только грузинский номер (+995)
      const phone = gePhone(msg.contact && msg.contact.phone_number ? msg.contact.phone_number : text);
      const verified = !!(msg.contact && msg.contact.phone_number && phone);
      if (!phone) {
        await send(chat, "❗ Сейчас принимаем только грузинские номера (+995).\nНапишите номер, например: +995 555 12 34 56.");
        return sendContact(chat);
      }
      data.phone = phone; data.contact = phone;
      const city = data.city || "Батуми";
      const row = {
        status: "pending",
        building_name: data.address || (data.type ? `${data.type}, ${city}` : "Объект"),
        kind: COMPLEX_TYPES.test(data.type || "") ? "complex" : "house",
        district: city,
        lat: data.lat || 41.645, lng: data.lng || 41.642,
        deal: data.deal, type: data.type, rooms: data.rooms || 0, area: data.area || 0,
        floor: data.floor || "—", price: data.price || "—", per: data.deal === "rent" ? "в месяц" : data.deal === "daily" ? "в сутки" : "",
        about: data.about || "", photos: data.photos || [],
        tg_user_id: uid, tg_username: data.tg_username || "", contact: data.contact, phone: data.phone || "",
      };
      const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
      // привязка аккаунта к подтверждённому номеру (один номер — один аккаунт)
      if (uid) await supa.from("users").upsert({ tg_user_id: uid, phone: data.phone || null, username: data.tg_username || "" }, { onConflict: "tg_user_id" });
      await clearDraft(uid);
      if (error) return send(chat, "Ошибка сохранения, попробуйте позже. /start");
      await send(chat, "✅ Спасибо! Объявление отправлено на модерацию. Опубликуем после проверки и сообщим вам.");
      // CEO: фото → пин геопозиции для проверки → текст с кнопками
      if (row.photos.length) {
        await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.slice(0, 10).map((u) => ({ type: "photo", media: u })) });
      }
      if (data.lat) await tg("sendLocation", { chat_id: ADMIN, latitude: data.lat, longitude: data.lng });
      const geoLine = data.lat
        ? `\n📍 <a href="${mapsLink(data.lat, data.lng)}">проверить точку на карте</a> (откройте спутник)`
        : `\n⚠️ точка на карте НЕ указана`;
      const summary = `🆕 <b>Новое объявление</b>\n${DEAL_RU[row.deal]} · ${row.type}\n🏙 ${esc(city)}\n🏠 ${esc(row.building_name)}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · 🏢 ${esc(row.floor)}\n📷 ${row.photos.length} фото${geoLine}\n📞 ${row.contact}${verified ? " ✅ подтверждён" : ""}\n\n${esc(row.about)}`;
      await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: modButtons("pending", ins.id) });
      return;
    }
    default: return send(chat, "/start — добавить объект.");
  }
}

// Ссылка на конкретный объект на сайте (slug собирается так же, как в source.js groupRows)
function unitLink(row) {
  const uslug = slugify(`${row.building_name || "obj"}-${row.type || ""}-${row.price || ""}`);
  return `${SITE}/property/${uslug}`;
}
// Публикация объявления в канал-витрину. Возвращает массив message_id (для последующего удаления).
async function postToChannel(row) {
  if (!CHANNEL) return [];
  const per = row.per ? " " + row.per : "";
  const bits = [`📐 ${row.area || 0} м²`];
  if (row.rooms) bits.push(`🛏 ${row.rooms} комн.`);
  if (row.floor && row.floor !== "—") bits.push(`🏢 этаж ${esc(row.floor)}`);
  const about = (row.about || "").trim();
  const aboutShort = about.length > 380 ? about.slice(0, 380).trim() + "…" : about;
  const cap =
    `🆕 <b>${DEAL_RU[row.deal] || row.deal} · ${esc(row.type)}</b>\n` +
    `📍 ${esc(row.building_name)}\n` +
    `💰 <b>${esc(row.price)}${per}</b>\n` +
    `${bits.join(" · ")}\n` +
    `📞 ${esc(row.contact || "по запросу")}\n` +
    (aboutShort ? `\n${esc(aboutShort)}\n` : "") +
    `\n🔗 <a href="${unitLink(row)}">Открыть на сайте Baylux</a>`;
  const photos = Array.isArray(row.photos) ? row.photos.slice(0, 10) : [];
  try {
    if (photos.length) {
      const media = photos.map((u, i) => (i === 0 ? { type: "photo", media: u, caption: cap, parse_mode: "HTML" } : { type: "photo", media: u }));
      const res = await tg("sendMediaGroup", { chat_id: CHANNEL, media });
      return (res?.result || []).map((m) => m.message_id);
    }
    const res = await tg("sendMessage", { chat_id: CHANNEL, text: cap, parse_mode: "HTML" });
    return res?.result?.message_id ? [res.result.message_id] : [];
  } catch (e) {
    console.error("channel post error:", e?.message);
    return [];
  }
}

async function onCallback(cb) {
  const [action, id] = (cb.data || "").split(":");
  if (!id) return;

  // Модератор хочет исправить геопозицию объекта
  if (action === "eg") {
    await saveDraft(cb.from.id, "modgeo", { editId: id });
    await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Пришлите новую точку на карте" });
    await tg("sendMessage", { chat_id: cb.message.chat.id, text: `📍 Исправление геопозиции объекта.\nПришлите новую точку: 📎 → Геопозиция → «Выбрать на карте» (лучше в режиме «Спутник»).\nИли /cancel чтобы отменить.` });
    return;
  }

  const status = action === "ap" ? "approved" : "rejected"; // un/rj → rejected
  const { data: row } = await supa.from("listings").update({ status }).eq("id", id).select("*").single();
  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: status === "approved" ? "Опубликовано" : "Снято с публикации" });

  // Канал-витрина: при одобрении публикуем (один раз), при снятии — удаляем посты
  if (row && CHANNEL) {
    if (action === "ap" && !row.tg_post_id) {
      const ids = await postToChannel(row);
      if (ids.length) await supa.from("listings").update({ tg_post_id: ids.join(",") }).eq("id", id);
    } else if (action !== "ap" && row.tg_post_id) {
      for (const mid of String(row.tg_post_id).split(",")) {
        await tg("deleteMessage", { chat_id: CHANNEL, message_id: Number(mid) });
      }
      await supa.from("listings").update({ tg_post_id: null }).eq("id", id);
    }
  }
  const tag = status === "approved" ? "✅ ОПУБЛИКОВАНО" : "❌ СНЯТО С ПУБЛИКАЦИИ";
  const base = (cb.message.text || "").replace(/\n\n(✅ ОПУБЛИКОВАНО|❌ СНЯТО С ПУБЛИКАЦИИ).*$/s, "");
  await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: base + `\n\n${tag}`, parse_mode: "HTML", reply_markup: modButtons(status, id) });
  if (row && row.tg_user_id && action === "ap") {
    await tg("sendMessage", { chat_id: row.tg_user_id, text: `🎉 Ваш объект (${row.type} · ${row.building_name}) опубликован: ${SITE}` });
  }
}

export async function GET(req) {
  if (new URL(req.url).searchParams.get("setup") === "1") {
    const r = await tg("setWebhook", { url: `${SITE}/api/tg`, secret_token: SECRET, allowed_updates: ["message", "callback_query"] });
    await tg("setMyCommands", { commands: [
      { command: "start", description: "🏠 Меню" },
      { command: "add", description: "➕ Добавить объявление" },
      { command: "my", description: "📋 Мои объявления" },
      { command: "cancel", description: "Отмена" },
    ] });
    await tg("setChatMenuButton", { menu_button: { type: "commands" } });
    return Response.json(r);
  }
  return Response.json({ ok: true, bot: "baylux" });
}

export async function POST(req) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== SECRET) return new Response("forbidden", { status: 403 });
  if (!supa) return Response.json({ ok: true });
  let update;
  try { update = await req.json(); } catch { return Response.json({ ok: true }); }
  try {
    if (update.message) await onMessage(update.message);
    else if (update.callback_query) await onCallback(update.callback_query);
  } catch (e) { console.error("tg error:", e?.message); }
  return Response.json({ ok: true });
}
