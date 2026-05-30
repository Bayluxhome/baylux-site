import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supa } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN = process.env.TELEGRAM_CHAT_ID;
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };

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

export async function POST(req) {
  const session = verifySession(cookies().get("bx_session")?.value);
  if (!session) return Response.json({ ok: false, error: "auth" }, { status: 401 });
  if (!supa) return Response.json({ ok: false }, { status: 500 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ ok: false }); }

  const deal = ["sale", "rent", "daily"].includes(b.deal) ? b.deal : "sale";
  const row = {
    status: "pending",
    building_name: (b.address || "").trim() || (b.type ? `${b.type}, Батуми` : "Объект"),
    kind: /новострой/i.test(b.type || "") ? "complex" : "house",
    district: "",
    lat: Number(b.lat) || 41.645, lng: Number(b.lng) || 41.642,
    deal, type: b.type || "Квартира",
    rooms: parseInt(b.rooms, 10) || 0, area: parseInt(b.area, 10) || 0,
    floor: (b.floor || "—").toString(), price: normPrice(b.price), per: deal === "rent" ? "в месяц" : deal === "daily" ? "в сутки" : "",
    about: (b.about || "").toString(), photos: Array.isArray(b.photos) ? b.photos.slice(0, 10) : [],
    tg_user_id: session.id, tg_username: session.username || "", contact: (b.contact || "").toString(),
  };
  const { data: ins, error } = await supa.from("listings").insert(row).select("id").single();
  if (error) return Response.json({ ok: false });

  if (ADMIN && TOKEN) {
    if (row.photos.length) await tg("sendMediaGroup", { chat_id: ADMIN, media: row.photos.map((u) => ({ type: "photo", media: u })) });
    const summary = `🆕 <b>Новое объявление (с сайта)</b>\n${DEAL_RU[deal]} · ${row.type}\n🏠 ${row.building_name}\n💰 ${row.price}\n📐 ${row.area} м² · 🛏 ${row.rooms} комн. · этаж ${row.floor}\n📷 ${row.photos.length} фото\n👤 ${session.name || session.username || session.id}${row.contact ? "\n📞 " + row.contact : ""}\n\n${row.about}`;
    await tg("sendMessage", { chat_id: ADMIN, text: summary, parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "✅ Опубликовать", callback_data: `ap:${ins.id}` }, { text: "❌ Отклонить", callback_data: `rj:${ins.id}` }]] } });
  }
  return Response.json({ ok: true });
}
