import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const CHANNEL = process.env.TELEGRAM_CHANNEL || "";
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mapsLink = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`;

function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => null);
}
function fmtPrice(num, currency) {
  if (!num) return "—";
  return (currency === "GEL" ? "₾" : "$") + String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
function gePhone(raw) {
  const s = String(raw || "").replace(/[^\d]/g, "");
  if (s.startsWith("995") && s.length === 12) return "+" + s;
  if (s.length === 9) return "+995" + s;
  return null;
}
function cleanTg(raw) {
  const m = String(raw || "").trim().match(/(?:t\.me\/|@)?([A-Za-z0-9_]{3,})/);
  return m ? m[1].replace(/[^A-Za-z0-9_]/g, "") : "";
}
function modButtons(id) {
  return { inline_keyboard: [
    [{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }],
    [{ text: "📍 Исправить гео", callback_data: `eg:${id}` }],
  ] };
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }
  if (!b.id) return Response.json({ ok: false, error: "id" }, { status: 400 });

  // Проверка владельца
  const { data: existing } = await supa.from("listings").select("id, tg_user_id, tg_post_id").eq("id", b.id).single();
  if (!existing || String(existing.tg_user_id) !== String(session.id)) return Response.json({ ok: false, error: "forbidden" }, { status: 403 });

  const phone = gePhone(b.contact);
  if (!phone) return Response.json({ ok: false, error: "phone" }, { status: 400 });

  // Старый пост в канале удаляем — объявление снова на модерации
  if (CHANNEL && existing.tg_post_id) {
    for (const mid of String(existing.tg_post_id).split(",")) await tg("deleteMessage", { chat_id: CHANNEL, message_id: Number(mid) });
  }

  const deal = ["sale", "rent", "daily"].includes(b.deal) ? b.deal : "sale";
  const city = (b.city || "Батуми").toString().trim() || "Батуми";
  const currency = b.currency === "GEL" ? "GEL" : "USD";
  const priceNum = parseInt(String(b.price || "").replace(/[^\d]/g, ""), 10) || null;
  const amenities = Array.isArray(b.amenities) ? b.amenities.filter(Boolean).join(", ") : (b.amenities || "");
  const hasGeo = b.lat != null && b.lng != null;
  const row = {
    status: "pending",
    building_name: (b.address || "").trim() || (b.type ? `${b.type}, ${city}` : "Объект"),
    kind: /новострой/i.test(b.type || "") || (b.complex || "").trim() ? "complex" : "house",
    district: city,
    lat: Number(b.lat) || 41.645, lng: Number(b.lng) || 41.642,
    deal, type: b.type || "Квартира",
    rooms: parseInt(b.rooms, 10) || 0, area: parseInt(b.area, 10) || 0, bathrooms: parseInt(b.bathrooms, 10) || null,
    floor: (b.floor || "—").toString(), year: parseInt(b.year, 10) || null,
    complex: (b.complex || "").toString().trim(), amenities, no_commission: !!b.noCommission,
    price: fmtPrice(priceNum, currency), currency, price_num: priceNum, per: deal === "rent" ? "в месяц" : deal === "daily" ? "в сутки" : "",
    about: (b.about || "").toString(), photos: Array.isArray(b.photos) ? b.photos.slice(0, 10) : [],
    tg_username: cleanTg(b.tg) || session.username || "", contact: phone, phone, tg_post_id: null,
  };
  const { error } = await supa.from("listings").update(row).eq("id", b.id);
  if (error) return Response.json({ ok: false });

  if (ADMIN && TOKEN) {
    if (row.photos.length) await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.map((u) => ({ type: "photo", media: u })) });
    if (hasGeo) await tg("sendLocation", { chat_id: ADMIN, latitude: row.lat, longitude: row.lng });
    const geoLine = hasGeo ? `\n📍 <a href="${mapsLink(row.lat, row.lng)}">проверить точку</a>` : `\n⚠️ точка на карте НЕ указана`;
    const summary = `✏️ <b>Объявление отредактировано (с сайта) — повторная модерация</b>\n${DEAL_RU[deal]} · ${row.type}\n🏙 ${esc(city)}\n🏠 ${esc(row.building_name)}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · 🏢 ${esc(row.floor)}\n📷 ${row.photos.length} фото${geoLine}\n📞 ${phone}\n\n${esc(row.about)}`;
    await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: modButtons(b.id) });
  }
  return Response.json({ ok: true });
}
