import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { verifySession, isAdmin } from "@/lib/session";
import { supa } from "@/lib/supabase";
import { OPERATOR } from "@/config";

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
// Номер агентства (один на все объявления из таблицы). Чужие телефоны не публикуем.
const AGENCY_PHONE = gePhone(OPERATOR.phone) || "+995511124781";
// Чистим описание: убираем ссылки, чужие @ник, призывы «в личку / в профиле», телефонные строки и пустые эмодзи-строки.
function cleanAbout(raw) {
  // Флаг u обязателен: без него класс [📞☎] ловит суррогатные половины других эмодзи.
  const drop = /(https?:\/\/|t\.me\/|www\.|@[a-z0-9_]{3,}|в\s*личк|в\s*описани|профил|канал|подбор|по\s*всем\s*вопрос|[📞☎])/iu;
  return String(raw || "")
    .replace(/ /g, " ")
    .split(/\r?\n/)
    .map((l) => l.replace(/#[\p{L}][^\s#]*/gu, "").trim())       // убрать буквенные хэштеги (#11 — номер дома — сохраняем)
    .filter((l) => l && /[\p{L}\p{N}]/u.test(l) && !drop.test(l)) // только строки с буквами/цифрами и без «мусора»
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
// Кнопки модерации одного объекта — те же, что в add-listing/route.js (callback ap/rj/eg/et обрабатывает tg/route.js).
function modButtons(id) {
  return { inline_keyboard: [
    [{ text: "✅ Опубликовать", callback_data: `ap:${id}` }, { text: "❌ Отклонить", callback_data: `rj:${id}` }],
    [{ text: "📍 Исправить гео", callback_data: `eg:${id}` }, { text: "✏️ Редактировать текст", callback_data: `et:${id}` }],
  ] };
}
// Не шлём карточки по одному, если объектов больше — только итоговую сводку пачки (защита от флуда).
const PER_OBJECT_LIMIT = 25;

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : [];
  if (!rows.length) return Response.json({ ok: false, error: "empty" }, { status: 400 });

  // Телефон, который покажется на ВСЕХ объектах пачки — это номер ЗАГРУЖАЮЩЕГО (а не из строк таблицы).
  // Источник: профиль риелтора → users (Telegram) → для админа фолбэк на номер агентства.
  let uploaderPhone = null;
  try {
    const rq = session.id != null
      ? supa.from("realtors").select("phone").eq("tg_user_id", session.id)
      : supa.from("realtors").select("phone").eq("email", session.email);
    const { data: rp } = await rq.maybeSingle();
    uploaderPhone = gePhone(rp?.phone);
    if (!uploaderPhone && session.id != null) {
      const { data: up } = await supa.from("users").select("phone").eq("tg_user_id", session.id).maybeSingle();
      uploaderPhone = gePhone(up?.phone);
    }
  } catch (e) { console.error("uploader phone lookup:", e?.message); }
  if (!uploaderPhone && isAdmin(session)) uploaderPhone = AGENCY_PHONE;
  if (!uploaderPhone) return Response.json({ ok: false, error: "no_phone" }, { status: 400 });

  const batchId = randomUUID();
  const inserted = [];
  const errors = [];   // { id, reason }
  const geoFails = []; // локальные id с неточным гео

  for (const r of rows) {
    const refId = r.id != null ? String(r.id) : "?";
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
    const about = cleanAbout(r.about); // чистим текст от ссылок/чужих контактов

    // Геокодинг адреса; фолбэк — центр города (geo_ok=false).
    const g = await geocode(`${address}, ${city}, Georgia`);
    const geoOk = !!g;
    const pt = g || CITY_CENTER[city] || CITY_CENTER["Батуми"];
    if (!geoOk) geoFails.push(refId);

    const row = {
      status: "pending", batch_id: batchId, geo_ok: geoOk,
      lang, ["desc_" + lang]: about, ["name_" + lang]: buildingName,
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
      about,
      photos: Array.isArray(r.photos) ? r.photos.slice(0, 10) : [],
      photo_hashes: Array.isArray(r.photo_hashes) ? r.photo_hashes.slice(0, 10) : [],
      tg_user_id: session.id ?? null, owner_email: session.email || null,
      // Публикуем номер загрузившего на всех объектах; чужой телефон/Telegram из таблицы не показываем.
      tg_username: "", contact: uploaderPhone, phone: uploaderPhone,
    };
    const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
    if (error) { errors.push({ id: refId, reason: "БД" }); continue; }
    // Храним весь row — он нужен для подробной карточки модерации каждого объекта.
    inserted.push({ dbId: ins.id, refId, deal, type: row.type, city, price: row.price, geoOk, row });
  }

  // Модерация. Небольшую пачку (≤ PER_OBJECT_LIMIT) шлём по объектам — отдельной
  // карточкой с фото и кнопками ✅/❌/📍 (callback ap/rj/eg), чтобы одобрять по одному.
  // В конце — всегда итоговое сообщение пачки с кнопками «одобрить/отклонить всю пачку».
  if (ADMIN && TOKEN && inserted.length) {
    // Блок «Связаться с автором» (тот, кто загрузил пачку) — отдельно от публичного контакта на сайте.
    const authorRows = [];
    let authorLine = "";
    const auName = session.name || session.username || session.email || (session.id != null ? String(session.id) : "");
    if (session.username) {
      authorRows.push([{ text: "💬 Связаться с автором", url: `https://t.me/${session.username}` }]);
      authorLine = `\n👤 Автор: ${esc(auName)} (@${esc(session.username)})`;
    } else if (session.id != null) {
      authorLine = `\n👤 Автор: ${esc(auName)} (Telegram id ${esc(session.id)})`;
    } else if (session.email) {
      authorLine = `\n👤 Автор: ${esc(session.email)}${uploaderPhone ? ` · ${esc(uploaderPhone)}` : ""}`;
    }
    const withAuthor = (kb) => (authorRows.length ? { inline_keyboard: [...kb.inline_keyboard, ...authorRows] } : kb);

    if (inserted.length <= PER_OBJECT_LIMIT) {
      for (const x of inserted) {
        const row = x.row;
        // У медиагруппы кнопок не бывает — фото отдельно, кнопки на тексте после неё.
        if (row.photos.length) {
          await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.map((u) => ({ type: "photo", media: u })) });
        }
        // Дубль по фото: совпадение хотя бы одного хэша с другим объектом этой пачки ИЛИ с любым в БД.
        const hashes = Array.isArray(row.photo_hashes) ? row.photo_hashes.filter(Boolean) : [];
        let dupNote = "";
        if (hashes.length) {
          const inBatch = inserted.find((y) => y !== x && Array.isArray(y.row.photo_hashes) && y.row.photo_hashes.some((h) => hashes.includes(h)));
          let inDb = null;
          if (!inBatch) {
            try {
              const { data: dups } = await supa.from("listings").select("id").overlaps("photo_hashes", hashes).neq("id", x.dbId).limit(1);
              inDb = dups && dups[0] ? dups[0] : null;
            } catch (e) { console.error("dup check:", e?.message); }
          }
          if (inBatch || inDb) {
            const ref = inBatch ? `#${esc(inBatch.refId)}` : `#${esc(inDb.id)}`;
            dupNote = `\n⚠️ Возможный дубль — совпадают фото (объект ${ref})`;
          }
        }
        const geoLine = x.geoOk ? "" : `\n⚠️ гео неточное (центр города)`;
        const card =
          `🆕 <b>Объект из пачки #${esc(x.refId)}</b>\n` +
          `${DEAL_RU[row.deal]} · ${esc(row.type)}\n` +
          `🏙 ${esc(row.district)}\n🏠 ${esc(row.building_name)}\n` +
          `💰 ${esc(row.price)}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · 🏢 ${esc(row.floor)}\n` +
          `📷 ${row.photos.length} фото\n📞 ${esc(row.contact)}${geoLine}${dupNote}${authorLine}` +
          (row.about ? `\n\n${esc(row.about)}` : "");
        await tg("sendMessage", { chat_id: ADMIN, text: card, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: withAuthor(modButtons(x.dbId)) });
      }
    }

    // Итоговая сводка пачки — для быстрого одобрения/отклонения всех сразу.
    const lines = inserted.slice(0, 40).map((x) =>
      `${x.geoOk ? "•" : "⚠️"} #${esc(x.refId)} ${DEAL_RU[x.deal]} · ${esc(x.type)} · ${esc(x.city)} · ${esc(x.price)}`).join("\n");
    const more = inserted.length > 40 ? `\n…и ещё ${inserted.length - 40}` : "";
    const warn = geoFails.length ? `\n⚠️ Неточное гео (центр города): ${geoFails.length} шт. — проверьте на карте в /admin.` : "";
    const skipped = errors.length ? `\n⏭ Пропущено строк: ${errors.length} (${errors.slice(0, 8).map((e) => `#${esc(e.id)}:${e.reason}`).join(", ")}).` : "";
    const note = inserted.length > PER_OBJECT_LIMIT ? `\nℹ️ Объектов больше ${PER_OBJECT_LIMIT} — карточки по одному не слались; разбирайте в админке или одобрите всю пачку.` : "";
    const text =
      `📦 <b>Массовая загрузка — на модерации</b>${authorLine}\n` +
      `📋 Объектов в пачке: <b>${inserted.length}</b>${warn}${skipped}${note}\n\n${lines}${more}\n\n` +
      `🔗 <a href="${SITE}/admin">Разобрать в админке</a>`;
    await tg("sendMessage", { chat_id: ADMIN, text, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: withAuthor(batchButtons(batchId)) });
  }

  return Response.json({ ok: true, batchId, count: inserted.length, geoFails, errors });
}
