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
const DISTRICT_COORDS = {
  "старый батуми": [41.645, 41.642], "новый бульвар": [41.652, 41.63],
  "аэропорт": [41.61, 41.6], "гонио": [41.572, 41.571], "махинджаури": [41.68, 41.67],
  "чакви": [41.72, 41.69], "центр": [41.643, 41.632], "кахабери": [41.62, 41.65],
};

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

// ---- состояние диалога в Supabase ----
async function getDraft(uid) {
  const { data } = await supa.from("drafts").select("*").eq("tg_user_id", uid).maybeSingle();
  return data || { tg_user_id: uid, step: null, data: {} };
}
async function saveDraft(uid, step, data) {
  await supa.from("drafts").upsert({ tg_user_id: uid, step, data, updated_at: new Date().toISOString() });
}
async function clearDraft(uid) {
  await supa.from("drafts").delete().eq("tg_user_id", uid);
}

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
  deal: { q: "Шаг 1/8. Тип сделки?", kb: [["Продажа", "Аренда", "Посуточно"]] },
  type: { q: "Шаг 2/8. Тип объекта?", kb: [["Квартира", "Студия", "Дом"], ["Коммерция", "Офис"], ["Участок", "Гараж"]] },
  district: { q: "Шаг 3/8. Район (например: Новый бульвар, Старый Батуми, Аэропорт, Гонио)?", kb: [["Новый бульвар", "Старый Батуми"], ["Аэропорт", "Гонио"], ["Центр", "Махинджаури"]] },
  price: { q: "Шаг 4/8. Цена? (например: $74 000 — для продажи, или $650 / мес — для аренды)" },
  area: { q: "Шаг 5/8. Площадь в м²? (число, например 56)" },
  rooms: { q: "Шаг 6/8. Сколько комнат? (число; для студии/коммерции — 0)" },
  about: { q: "Шаг 7/8. Краткое описание объекта." },
  photos: { q: "Шаг 8/8. Пришлите фото объекта (по одному, до 8 шт). Когда закончите — отправьте /done. Можно и без фото — тогда сразу /done." },
  contact: { q: "Последний шаг. Ваш контакт для связи (телефон или @username)." },
};

async function ask(chat, step) { return send(chat, STEPS[step].q, STEPS[step].kb); }

// ---- обработка сообщения пользователя ----
async function onMessage(msg) {
  const chat = msg.chat.id;
  const uid = msg.from.id;
  const text = (msg.text || "").trim();

  if (text === "/start" || text === "/add" || text === "/добавить") {
    await saveDraft(uid, "deal", { tg_user_id: uid, tg_username: msg.from.username || "" });
    await send(chat, "👋 Добавим ваш объект в Baylux. Отвечайте по шагам — это пара минут. /cancel — отмена.");
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
    case "type": { data.type = text; await saveDraft(uid, "district", data); return ask(chat, "district"); }
    case "district": { data.district = text; await saveDraft(uid, "price", data); return ask(chat, "price"); }
    case "price": { data.price = text; await saveDraft(uid, "area", data); return ask(chat, "area"); }
    case "area": { data.area = parseInt(text, 10) || 0; await saveDraft(uid, "rooms", data); return ask(chat, "rooms"); }
    case "rooms": { data.rooms = parseInt(text, 10) || 0; await saveDraft(uid, "about", data); return ask(chat, "about"); }
    case "about": { data.about = text; data.photos = []; await saveDraft(uid, "photos", data); return ask(chat, "photos"); }
    case "photos": {
      if (msg.photo && msg.photo.length) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;
        const url = await uploadPhoto(fileId);
        if (url) { data.photos = (data.photos || []).concat(url); await saveDraft(uid, "photos", data); return send(chat, `📷 Фото добавлено (${data.photos.length}). Ещё фото или /done.`); }
        return send(chat, "Не удалось загрузить фото, попробуйте другое или /done.");
      }
      if (text === "/done" || text === "/готово") { await saveDraft(uid, "contact", data); return ask(chat, "contact"); }
      return send(chat, "Пришлите фото или отправьте /done.");
    }
    case "contact": {
      data.contact = text;
      const coords = DISTRICT_COORDS[(data.district || "").toLowerCase()] || [41.645, 41.642];
      const row = {
        status: "pending",
        building_name: data.type ? `${data.type} — ${data.district || "Батуми"}` : "Объект",
        kind: COMPLEX_TYPES.test(data.type || "") ? "complex" : "house",
        district: data.district || "Батуми",
        lat: coords[0], lng: coords[1],
        deal: data.deal, type: data.type, rooms: data.rooms || 0, area: data.area || 0,
        floor: "—", price: data.price || "—", per: data.deal === "rent" ? "в месяц" : data.deal === "daily" ? "в сутки" : "",
        about: data.about || "", photos: data.photos || [],
        tg_user_id: uid, tg_username: data.tg_username || "", contact: data.contact,
      };
      const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
      await clearDraft(uid);
      if (error) return send(chat, "Ошибка сохранения, попробуйте позже. /start");
      await send(chat, "✅ Спасибо! Объявление отправлено на модерацию. Мы опубликуем его после проверки и сообщим вам.");
      // уведомление CEO с кнопками
      const summary = `🆕 <b>Новое объявление</b>\n${DEAL_RU[row.deal]} · ${row.type} · ${row.district}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн.\n📷 ${row.photos.length} фото\n📞 ${row.contact}\n\n${row.about}`;
      await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Опубликовать", callback_data: `ap:${ins.id}` }, { text: "❌ Отклонить", callback_data: `rj:${ins.id}` }]] } });
      return;
    }
    default: return send(chat, "/start — добавить объект.");
  }
}

// ---- модерация (кнопки CEO) ----
async function onCallback(cb) {
  const [action, id] = (cb.data || "").split(":");
  if (!id) return;
  const status = action === "ap" ? "approved" : "rejected";
  const { data: row } = await supa.from("listings").update({ status }).eq("id", id).select("tg_user_id,type,district").single();
  await tg("answerCallbackQuery", { callback_query_id: cb.id, text: status === "approved" ? "Опубликовано" : "Отклонено" });
  const tag = status === "approved" ? "✅ ОПУБЛИКОВАНО" : "❌ ОТКЛОНЕНО";
  await tg("editMessageText", { chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: cb.message.text + `\n\n${tag}`, parse_mode: "HTML" });
  if (row && row.tg_user_id) {
    const note = status === "approved" ? `🎉 Ваш объект (${row.type} · ${row.district}) опубликован на ${SITE}` : `Ваш объект (${row.type} · ${row.district}) не прошёл модерацию.`;
    await tg("sendMessage", { chat_id: row.tg_user_id, text: note });
  }
}

// ---- роуты ----
export async function GET(req) {
  const setup = new URL(req.url).searchParams.get("setup");
  if (setup === "1") {
    const r = await tg("setWebhook", { url: `${SITE}/api/tg`, secret_token: SECRET, allowed_updates: ["message", "callback_query"] });
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
