// Публикация объявления в Telegram-каналы (Батуми/Тбилиси). Вынесено из api/tg (20.10.2026),
// чтобы тем же кодом публиковали и модерация в боте, и автопубликация (lib/autoModeration).
import { slugify } from "@/data/sheet";
import { SITE_URL, channelForCity } from "@/config";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const CH_BATUMI = process.env.TELEGRAM_CHANNEL || "";
export const CH_TBILISI = process.env.TELEGRAM_CHANNEL_TBILISI || "";
const DEAL_RU = { sale: "Продажа", rent: "Аренда", daily: "Посуточно" };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function tg(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

// Канал — по заявленному городу (config.channelForCity), не по координатам.
export function pickChannel(row) {
  if (!CH_TBILISI) return CH_BATUMI;
  return channelForCity(row.district)?.key === "tbilisi" ? CH_TBILISI : CH_BATUMI;
}

function unitLink(row) {
  const uslug = slugify(`${row.building_name || "obj"}-${row.type || ""}-${row.price || ""}`);
  return `${SITE_URL}/property/${uslug}`;
}

export async function postToChannel(row, channel) {
  if (!channel || !TOKEN) return [];
  const per = row.per ? " " + row.per : "";
  const bits = [`📐 ${row.area || 0} м²`];
  if (row.rooms) bits.push(`🛏 ${row.rooms} комн.`);
  if (row.floor && row.floor !== "—") bits.push(`🏢 этаж ${esc(row.floor)}`);
  const about = (row.about || "").trim();
  const aboutShort = about.length > 380 ? about.slice(0, 380).trim() + "…" : about;
  const tag = (s) => "#" + String(s || "").replace(/[^\p{L}\p{N}]/gu, "");
  const tags = [tag(row.district), tag(DEAL_RU[row.deal])].filter((t) => t.length > 1).join(" ");
  const cap =
    `🆕 <b>${DEAL_RU[row.deal] || row.deal} · ${esc(row.type)}</b>\n` +
    `📍 ${esc(row.building_name)}\n` +
    `💰 <b>${esc(row.price)}${per}</b>\n` +
    `${bits.join(" · ")}\n` +
    `📞 ${esc(row.contact || "по запросу")}\n` +
    `✈️ @${esc(row.tg_username || "bayluxhome")}\n` +
    (aboutShort ? `\n${esc(aboutShort)}\n` : "") +
    `\n🔗 <a href="${unitLink(row)}">Открыть на сайте Baylux</a>` +
    (tags ? `\n\n${tags}` : "");
  const photos = Array.isArray(row.photos) ? row.photos.slice(0, 10) : [];
  try {
    if (photos.length) {
      const media = photos.map((u, i) => (i === 0 ? { type: "photo", media: u, caption: cap, parse_mode: "HTML" } : { type: "photo", media: u }));
      const res = await tg("sendMediaGroup", { chat_id: channel, media });
      return (res?.result || []).map((m) => m.message_id);
    }
    const res = await tg("sendMessage", { chat_id: channel, text: cap, parse_mode: "HTML" });
    return res?.result?.message_id ? [res.result.message_id] : [];
  } catch (e) { console.error("channel post error:", e?.message); return []; }
}
