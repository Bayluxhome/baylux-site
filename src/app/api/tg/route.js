import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID; // чат CEO для модерации
const API = `https://api.telegram.org/bot${TOKEN}`;
const SECRET = (TOKEN || "").slice(-24).replace(/[^A-Za-z0-9_-]/g, "") || "baylux";
const SITE = "https://baylux-site.vercel.app";

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
  return tg("sendMessage", { chat_id: chat, text: STEPS.contact.q, reply_markup: { keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
}
function modButtons(status, id) {
  if (status === "approved") return { inline_keyboard: [[{ text: "🗑 Снять с публикации", callback_data: `un:${id}` }]] };
  if (status === "rejected") return { inline_keyboard: [[{ text: "↩️ Опубликовать", callback_data: `ap:${id}` }]] };
  return { inline_keyboard: [[{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }]] };
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

const STEPS = {
  deal: { q: "Шаг 1/10. Тип сделки?", kb: [["Продажа", "Аренда", "Посуточно"]] },
  type: { q: "Шаг 2/10. Тип объекта?", kb: [["Квартира", "Студия", "Дом"], ["Коммерция", "Офис"], ["Участок", "Гараж"]] },
  address: { q: "Шаг 3/10. Адрес объекта (улица и номер дома). Например: ул. Шерифа Химшиашвили, 1" },
  geo: { q: "Шаг 4/10. Пришлите точку на карте, чтобы объект точно встал на карте сайта:\n📎 (скрепка) → Геопозиция → отправить.\nЕсли не получается — напишите «пропустить»." },
  price: { q: "Шаг 5/10. Цена? Например: $74 000 (продажа) или $650 / мес (аренда)" },
  area: { q: "Шаг 6/10. Площадь в м²? (число, например 56)" },
  rooms: { q: "Шаг 7/10. Сколько комнат? (число; студия/коммерция — 0)" },
  floor: { q: "Шаг 8/10. Этаж? Например: 10/22 (этаж/всего этажей). Для дома/участка — поставьте «—»." },
  about: { q: "Шаг 9/10. Краткое описание объекта." },
  photos: { q: "Шаг 10/10. Пришлите фото (по одному, до 8). Когда закончите — /done. Можно без фото — сразу /done." },
  contact: { q: "Последний шаг. Нажмите кнопку «📱 Поделиться номером» ниже — номер подтвердится автоматически. (Или впишите контакт текстом.)" },
};
async function ask(chat, step) { return send(chat, STEPS[step].q, STEPS[step].kb); }

async function onMessage(msg) {
  const chat = msg.chat.id;
  const uid = msg.from.id;
  const text = (msg.text || "").trim();

  if (text === "/start" || text === "/add" || text === "/добавить") {
    await saveDraft(uid, "deal", { tg_user_id: uid, tg_username: msg.from.username || "" });
    await send(chat, "👋 Добавим ваш объект в Baylux. Отвечайте по шагам — пара минут. /cancel — отмена.");
    return ask(chat, "deal");
  }
  if (text === "/cancel" || text === "/отмена") { await clearDraft(uid); return send(chat, "Отменено. /start — начать заново."); }

  const d = await getDraft(uid);
  if (!d.step) return send(chat, "Чтобы добавить объект, отправьте /start");
  const data = d.data || {};

  switch (d.step) {
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
      let verified = false;
      if (msg.contact && msg.contact.phone_number) {
        let ph = msg.contact.phone_number; if (!ph.startsWith("+")) ph = "+" + ph;
        data.phone = ph; data.contact = ph; verified = true;
      } else {
        data.contact = text;
        if (/^\+?\d[\d\s()-]{6,}$/.test(text)) data.phone = text.replace(/[\s()-]/g, "");
      }
      const row = {
        status: "pending",
        building_name: data.address || (data.type ? `${data.type}, Батуми` : "Объект"),
        kind: COMPLEX_TYPES.test(data.type || "") ? "complex" : "house",
        district: "",
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
      // CEO: сначала фото, затем текст с кнопками
      if (row.photos.length) {
        await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.slice(0, 10).map((u) => ({ type: "photo", media: u })) });
      }
      const geo = data.lat ? `\n📍 точка на карте: да` : `\n⚠️ точка на карте не указана`;
      const summary = `🆕 <b>Новое объявление</b>\n${DEAL_RU[row.deal]} · ${row.type}\n🏠 ${row.building_name}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн.\n📷 ${row.photos.length} фото${geo}\n📞 ${row.contact}${verified ? " ✅ подтверждён" : ""}\n\n${row.about}`;
      await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", reply_markup: modButtons("pending", ins.id) });
      return;
    }
    default: return send(chat, "/start — добавить объект.");
  }
}

async function onCallback(cb) {
  const [action, id] = (cb.data || "").split(":");
  if (!id) return;
  const status = action === "ap" ? "approved" : "rejected"; // un/rj → rejected
  const { data: row } = await supa.from("listings").update({ status }).eq("id", id).select("tg_user_id,type,building_name").single();
  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: status === "approved" ? "Опубликовано" : "Снято с публикации" });
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
      { command: "start", description: "➕ Добавить объявление" },
      { command: "cancel", description: "Отменить заполнение" },
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
