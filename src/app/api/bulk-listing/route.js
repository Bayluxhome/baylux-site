import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const SITE = "https://bayluxhome.com";
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Центры городов — фолбэк, если адрес не геокодировался.
const CITY_CENTER = {
  "Батуми": { lat: 41.6168, lng: 41.6367 }, "Тбилиси": { lat: 41.7151, lng: 44.8271 },
  "Кобулети": { lat: 41.8211, lng: 41.7766 }, "Гонио": { lat: 41.5636, lng: 41.5719 },
  "Чакви": { lat: 41.7314, lng: 41.7264 }, "Кутаиси": { lat: 42.2679, lng: 42.7180 },
  "Рустави": { lat: 41.5495, lng: 44.9938 }, "Бакуриани": { lat: 41.7460, lng: 43.5320 },
  "Гудаури": { lat: 42.4770, lng: 44.4810 }, "Местиа": { lat: 43.0455, lng: 42.7290 },
  "Махинджаури": { lat: 41.6708, lng: 41.6428 },
};

function tg(method, body) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
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
function fmtPrice(num, currency) {
  if (!num) return null;
  const sym = currency === "GEL" ? "₾" : "$";
  return sym + String(num).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
async function geocode(q) {
  const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=1&country=ge`);
    const j = await r.json();
    const c = j?.features?.[0]?.center;
    if (Array.isArray(c) && c.length === 2) return { lat: c[1], lng: c[0] };
  } catch (e) { console.error("geocode error:", e?.message); }
  return null;
}
function batchButtons(batchId) {
  return { inline_keyboard: [[
    { text: "✅ Одобрить пачку", callback_data: `bap:${batchId}` },
    { text: "❌ Отклонить пачку", callback_data: `brj:${batchId}` },
  ]] };
}

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
  if (!rows.length) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  const batchId = randomUUID();
  const inserted = [];
  const errors = [];   // { id, reason }
  const geoFails = []; // локальные id с неточным гео

  for (const r of rows) {
    const refId = r.id != null ? String(r.id) : "?";
    const phone = gePhone(r.phone);
    if (!phone) { errors.push({ id: refId, reason: "телефон" }); continue; }
    const address = (r.address || "").toString().trim();
    if (!address) { errors.push({ id: refId, reason: "адрес" }); continue; }
    if (!(parseInt(String(r.price || "").replace(/[^\d]/g, ""), 10) || 0)) { errors.push({ id: refId, reason: "цена" }); continue; }

    const deal = ["sale", "rent", "daily"].includes(r.deal) ? r.deal : "sale";
    const city = (r.city || "Батуми").toString().trim() || "Батуми";
    const currency = r.currency === "GEL" ? "GEL" : "USD";
    const priceNum = parseInt(String(r.price || "").replace(/[^\d]/g, ""), 10) || null;
    const lang = ["ru", "en", "ka"].includes(r.lang) ? r.lang : "ru";
    const amenities = Array.isArray(r.amenities) ? r.amenities.filter(Boolean).join(", ") : (r.amenities || "").toString();
    const buildingName = address || (r.type ? `${r.type}, ${city}` : "Объект");

    // Геокодинг адреса; фолбэк — центр города (geo_ok=false).
    const g = await geocode(`${address}, ${city}, Georgia`);
    const geoOk = !!g;
    const pt = g || CITY_CENTER[city] || CITY_CENTER["Батуми"];
    if (!geoOk) geoFails.push(refId);

    const row = {
      status: "pending", batch_id: batchId, geo_ok: geoOk,
      lang, ["desc_" + lang]: (r.about || "").toString(), ["name_" + lang]: buildingName,
      building_name: buildingName,
      kind: /новострой/i.test(r.type || "") || (r.complex || "").toString().trim() ? "complex" : "house",
      district: city, lat: pt.lat, lng: pt.lng,
      deal, type: r.type || "Квартира",
      rooms: parseInt(r.rooms, 10) || 0, area: parseInt(r.area, 10) || 0,
      bathrooms: parseInt(r.bathrooms, 10) || null,
      floor: (r.floor || "—").toString(), year: parseInt(r.year, 10) || null,
      complex: (r.complex || "").toString().trim(), amenities, no_commission: !!r.no_commission,
      price: fmtPrice(priceNum, currency), currency, price_num: priceNum,
      per: deal === "rent" ? "в месяц" : deal === "daily" ? "в сутки" : "",
      about: (r.about || "").toString(),
      photos: Array.isArray(r.photos) ? r.photos.slice(0, 10) : [],
      tg_user_id: session.id ?? null, owner_email: session.email || null,
      tg_username: cleanTg(r.tg) || session.username || "", contact: phone, phone,
    };
    const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
    if (error) { errors.push({ id: refId, reason: "БД" }); continue; }
    inserted.push({ dbId: ins.id, refId, deal, type: row.type, city, price: row.price, geoOk });
  }

  // Одно сообщение модерации на всю пачку.
  if (ADMIN && TOKEN && inserted.length) {
    const lines = inserted.slice(0, 40).map((x) =>
      `${x.geoOk ? "•" : "⚠️"} #${esc(x.refId)} ${DEAL_RU[x.deal]} · ${esc(x.type)} · ${esc(x.city)} · ${esc(x.price)}`).join("\n");
    const more = inserted.length > 40 ? `\n…и ещё ${inserted.length - 40}` : "";
    const who = esc(session.name || session.username || session.email || session.id);
    const warn = geoFails.length ? `\n⚠️ Неточное гео (центр города): ${geoFails.length} шт. — проверьте на карте в /admin.` : "";
    const skipped = errors.length ? `\n⏭ Пропущено строк: ${errors.length} (${errors.slice(0, 8).map((e) => `#${esc(e.id)}:${e.reason}`).join(", ")}).` : "";
    const text =
      `📦 <b>Массовая загрузка — на модерации</b>\n` +
      `👤 ${who}\n📋 Объектов в пачке: <b>${inserted.length}</b>${warn}${skipped}\n\n${lines}${more}\n\n` +
      `🔗 <a href="${SITE}/admin">Разобрать в админке</a>`;
    await tg("sendMessage", { chat_id: ADMIN, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: batchButtons(batchId) });
  }
  if (session.id != null && inserted[0]) {
    // запомним телефон владельца (как в одиночном добавлении)
    const ph = gePhone(rows.find((r) => gePhone(r.phone))?.phone);
    if (ph) await supa.from("users").upsert({ tg_user_id: session.id, phone: ph, username: session.username || "" }, { onConflict: "tg_user_id" });
  }

  return Response.json({ ok: true, batchId, count: inserted.length, geoFails, errors });
}
