import { cookies } from "next/headers";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
}
function normPrice(raw) {
  let s = (raw || "").trim();
  if (!s) return "—";
  s = s.replace(/\d{4,}/, (m) => m.replace(/\B(?=(\d{3})+(?!\d))/g, " "));
  if (!/[$₾€]|usd|gel|lari|лар|eur|евро/i.test(s)) s = "$" + s;
  return s.replace(/\$\s*\$+/g, "$");
}
// Цена числом + символ валюты → «$85 000» / «₾85 000»
function fmtPrice(num, currency) {
  if (!num) return null;
  const sym = currency === "GEL" ? "₾" : "$";
  return sym + String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
// Грузинский номер: +995XXXXXXXXX, 995XXXXXXXXX или локальные 9 цифр. Иначе null.
function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
}
// Telegram-ник из «@username» или ссылки t.me/username
function cleanTg(raw) {
  const m = String(raw || "").trim().match(/(?:t\.me\/|@)?([A-Za-z0-9_]{3,})/);
  return m ? m[1].replace(/[^A-Za-z0-9_]/g, "") : "";
}
// Кнопки модерации — те же, что в боте (включая исправление гео и редактирование текста)
function modButtons(id) {
  return { inline_keyboard: [
    [{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }],
    [{ text: "📍 Исправить гео", callback_data: `eg:${id}` }, { text: "✏️ Редактировать текст", callback_data: `et:${id}` }],
  ] };
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  const admin = isAdmin(session); // главный админ: публикуем сразу, без модерации в боте
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  // Только грузинские номера (+995) — синхронно с ботом
  const phone = gePhone(b.contact);
  if (!phone) return Response.json({ ok: false, error: "phone" }, { status: 400 });

  const deal = ["sale", "rent", "daily"].includes(b.deal) ? b.deal : "sale";
  const city = (b.city || "Батуми").toString().trim() || "Батуми";
  const hasGeo = b.lat != null && b.lng != null;
  const currency = b.currency === "GEL" ? "GEL" : "USD";
  const priceNum = parseInt(String(b.price || "").replace(/[^\d]/g, ""), 10) || null;
  const priceStr = fmtPrice(priceNum, currency) || normPrice(b.price);
  const amenities = Array.isArray(b.amenities) ? b.amenities.filter(Boolean).join(", ") : (b.amenities || "");
  const lang = ["ru", "en", "ka"].includes(b.lang) ? b.lang : "ru";
  const aboutText = (b.about || "").toString();
  const buildingName = (b.address || "").trim() || (b.type ? `${b.type}, ${city}` : "Объект");
  const row = {
    status: admin ? "approved" : "pending", lang, ["desc_" + lang]: aboutText, ["name_" + lang]: buildingName,
    building_name: buildingName,
    kind: /новострой/i.test(b.type || "") || (b.complex || "").trim() ? "complex" : "house",
    district: city,
    lat: Number(b.lat) || 41.645, lng: Number(b.lng) || 41.642,
    deal, type: b.type || "Квартира",
    rooms: parseInt(b.rooms, 10) || 0, area: parseInt(b.area, 10) || 0,
    bathrooms: parseInt(b.bathrooms, 10) || null,
    floor: (b.floor || "—").toString(), year: parseInt(b.year, 10) || null,
    complex: (b.complex || "").toString().trim(), amenities, no_commission: !!b.noCommission,
    // ВАЖНО: «под управлением Baylux» может выставить только админ. Заявка владельца (b.managed)
    // не доверяется напрямую — она показывается модератору в боте, флаг ставит админ при одобрении.
    managed_by_baylux: admin ? !!b.managed : false,
    price: priceStr, currency, price_num: priceNum, per: deal === "rent" ? "в месяц" : deal === "daily" ? "в сутки" : "",
    about: (b.about || "").toString(), photos: Array.isArray(b.photos) ? b.photos.slice(0, 10) : [], photo_hashes: Array.isArray(b.photo_hashes) ? b.photo_hashes.slice(0, 10) : [], facade_photo: (b.facade || "").toString() || null,
    tg_user_id: session.id ?? null, owner_email: session.email || null, tg_username: cleanTg(b.tg) || session.username || "", contact: phone, phone,
  };
  const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
  if (error) return Response.json({ ok: false });
  if (session.id != null) await supa.from("users").upsert({ tg_user_id: session.id, phone, username: session.username || "" }, { onConflict: "tg_user_id" });

  if (!admin && ADMIN && TOKEN) {
    if (row.photos.length) await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.map((u) => ({ type: "photo", media: u })) });
    if (hasGeo) await tg("sendLocation", { chat_id: ADMIN, latitude: row.lat, longitude: row.lng });
    const geoLine = hasGeo
      ? `\n📍 <a href="${mapsLink(row.lat, row.lng)}">проверить точку на карте</a> (откройте спутник)`
      : `\n⚠️ точка на карте НЕ указана`;
    // Блок «Связаться с автором» (создатель объявления) — отдельно от публичного контакта на сайте.
    const authorRows = [];
    let authorLine = "";
    const auName = session.name || session.username || session.email || (session.id != null ? String(session.id) : "");
    if (session.username) {
      authorRows.push([{ text: "💬 Связаться с автором", url: `https://t.me/${session.username}` }]);
      authorLine = `\n👤 Автор: ${esc(auName)} (@${esc(session.username)})`;
    } else if (session.id != null) {
      authorLine = `\n👤 Автор: ${esc(auName)} (Telegram id ${esc(session.id)})`;
    } else if (session.email) {
      // вход по email — телефон автора берём из профиля риелтора (как в bulk-listing)
      let authorPhone = null;
      try {
        const { data: rp } = await supa.from("realtors").select("phone").eq("email", session.email).maybeSingle();
        authorPhone = gePhone(rp?.phone);
      } catch (e) { console.error("author phone:", e?.message); }
      authorLine = `\n👤 Автор: ${esc(session.email)}${authorPhone ? ` · ${esc(authorPhone)}` : ""}`;
    }
    const mgmtReq = b.managed ? `\n🏠 <b>ЗАЯВКА: взять в управление Baylux</b> (при одобрении выставьте managed)` : "";
    const summary = `🆕 <b>Новое объявление (с сайта)</b>${mgmtReq}\n${DEAL_RU[deal]} · ${row.type}\n🏙 ${esc(city)}\n🏠 ${esc(row.building_name)}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · 🏢 ${esc(row.floor)}\n📷 ${row.photos.length} фото${geoLine}${authorLine}\n📞 ${phone}\n\n${esc(row.about)}`;
    const kb = modButtons(ins.id);
    if (authorRows.length) kb.inline_keyboard = [...kb.inline_keyboard, ...authorRows];
    await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: kb });
  }
  return Response.json({ ok: true });
}
